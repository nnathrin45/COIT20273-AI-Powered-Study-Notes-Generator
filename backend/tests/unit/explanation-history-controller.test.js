const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

const controllerFile = require.resolve(
  "../../src/controllers/ai.controller"
);

const USER_ID = 11;
const FILE_ID = 101;
const CHAT_ID = 25;

const state = {
  queries: [],
  generated: [],
  historyRows: []
};

const reset = () => {
  state.queries = [];
  state.generated = [];
  state.historyRows = [];
};

const db = {
  async execute(sql, params = []) {
    state.queries.push({ sql, params });

    if (/FROM uploaded_files\b/.test(sql)) {
      return [
        Number(params[0]) === FILE_ID &&
        Number(params[1]) === USER_ID
          ? [{
              file_id: FILE_ID,
              file_name: "test.txt",
              extracted_text: "Portfolio governance requires reviews."
            }]
          : []
      ];
    }

    if (/FROM explanation_chats\b/.test(sql)) {
      const [chatId, userId] = params;

      if (Number(userId) !== USER_ID) {
        return [[]];
      }

      if (Number(chatId) === CHAT_ID) {
        return [[{
          chat_id: CHAT_ID,
          main_file_id: FILE_ID,
          title: "Test conversation"
        }]];
      }

      if (Number(chatId) === 27) {
        return [[{
          chat_id: 27,
          main_file_id: 999,
          title: "Different document"
        }]];
      }

      return [[]];
    }

    if (/FROM explanation_chat_sources\b/.test(sql)) {
      return [[]];
    }

    if (/FROM explanation_chat_outputs\b/.test(sql)) {
      assert.deepEqual(params.map(Number), [
        CHAT_ID,
        USER_ID,
        FILE_ID
      ]);

      assert.match(sql, /eco\.chat_id\s*=\s*\?/);
      assert.match(sql, /ao\.user_id\s*=\s*\?/);
      assert.match(sql, /ao\.file_id\s*=\s*\?/);
      assert.match(sql, /LIMIT\s+5/i);

      return [state.historyRows.slice(0, 5)];
    }

    if (/INSERT INTO ai_outputs\b/.test(sql)) {
      return [{ insertId: 900 }];
    }

    if (/INSERT INTO explanation_metadata\b/.test(sql)) {
      return [{ affectedRows: 1 }];
    }

    if (/INSERT INTO explanation_chat_outputs\b/.test(sql)) {
      return [{ affectedRows: 1 }];
    }

    if (/UPDATE explanation_chats\b/.test(sql)) {
      return [{ affectedRows: 1 }];
    }

    throw new Error(`Unexpected database query: ${sql}`);
  }
};

const dependencies = new Map([
  ["../config/database", db],
  ["../services/pdf.service", {
    extractTextFromPDF: async () => ""
  }],
  ["../services/docx.service", {
    extractTextFromDOCX: async () => ""
  }],
  ["../services/txt.service", {
    extractTextFromTXT: async () => ""
  }],
  ["../services/consent.service", {
    hasActiveConsent: async () => true
  }],
  ["../services/ai.service", {
    generate: async (text, type, options) => {
      state.generated.push({ text, type, options });
      return "Mock AI explanation";
    }
  }],
  ["../services/activity.service", {
    logActivity: async () => {}
  }]
]);

const originalLoad = Module._load;
let generateOutput;
let renameExplanationChat;

try {
  Module._load = function (request, parent, isMain) {
    if (
      parent &&
      parent.filename === controllerFile &&
      dependencies.has(request)
    ) {
      return dependencies.get(request);
    }

    return originalLoad.apply(this, arguments);
  };

  ({ generateOutput, renameExplanationChat } = require(controllerFile));
} finally {
  Module._load = originalLoad;
}

assert.equal(typeof generateOutput, "function");
assert.equal(typeof renameExplanationChat, "function");

const invoke = async (chatId = CHAT_ID) => {
  const result = {
    statusCode: 200,
    body: null
  };

  const req = {
    user: { user_id: USER_ID },
    body: {
      file_id: FILE_ID,
      output_type: "explanation",
      concept: "What did we discuss earlier?",
      level: "beginner",
      chat_id: chatId
    }
  };

  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    }
  };

  await generateOutput(req, res);
  return result;
};

test("Previous messages are retrieved and ordered chronologically", async () => {
  reset();

  state.historyRows = [
    { concept: "Newer question", content: "Newer answer" },
    { concept: "Older question", content: "Older answer" }
  ];

  const response = await invoke();

  assert.equal(response.statusCode, 201);
  assert.equal(state.generated.length, 1);

  const history = state.generated[0].options.history;

  assert.ok(history.includes("Older question"));
  assert.ok(history.includes("Older answer"));
  assert.ok(history.includes("Newer question"));
  assert.ok(history.includes("Newer answer"));

  assert.ok(
    history.indexOf("Older question") <
    history.indexOf("Newer question")
  );
});

test("Long previous answers retain later recommendations", async () => {
  reset();

  state.historyRows = [{
    concept: "What governance improvements are needed?",
    content:
      "Governance overview. " +
      "General governance discussion. ".repeat(60) +
      "Second recommendation: establish a formal PMO."
  }];

  const response = await invoke();

  assert.equal(response.statusCode, 201);

  const history = state.generated[0].options.history;

  assert.ok(
    history.includes(
      "Second recommendation: establish a formal PMO."
    ),
    "Important recommendations near the end of a previous answer should remain available."
  );
});

test("New conversations work without previous messages", async () => {
  reset();

  const response = await invoke();

  assert.equal(response.statusCode, 201);
  assert.equal(state.generated.length, 1);
  assert.equal(state.generated[0].options.history, "");
});

test("Controller requests a maximum of five previous turns", async () => {
  reset();

  state.historyRows = Array.from(
    { length: 8 },
    (_, index) => ({
      concept: `Question ${index}`,
      content: `Answer ${index}`
    })
  );

  const response = await invoke();

  assert.equal(response.statusCode, 201);

  const history = state.generated[0].options.history;

  assert.ok(history.includes("Question 0"));
  assert.ok(history.includes("Question 4"));
  assert.ok(!history.includes("Question 5"));
});

test("Unknown conversations are rejected before generation", async () => {
  reset();

  const response = await invoke(999);

  assert.equal(response.statusCode, 404);
  assert.equal(response.body.code, "CHAT_NOT_FOUND");
  assert.equal(state.generated.length, 0);

  assert.ok(
    !state.queries.some(({ sql }) =>
      /FROM explanation_chat_outputs\b/.test(sql)
    )
  );
});

test("Conversations belonging to another main file are rejected", async () => {
  reset();

  const response = await invoke(27);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, "CHAT_FILE_MISMATCH");
  assert.equal(state.generated.length, 0);
});

const invokeRename = async (
  title,
  chatId = CHAT_ID,
  userId = USER_ID
) => {
  const result = {
    statusCode: 200,
    body: null
  };

  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(body) {
      result.body = body;
      return this;
    }
  };

  await renameExplanationChat(
    {
      params: { chatId: String(chatId) },
      body: { title },
      user: { user_id: userId }
    },
    res
  );

  return result;
};

test("Rename: updates an owned conversation title", async () => {
  reset();

  const response = await invokeRename("Portfolio Governance");

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "success");
  assert.equal(response.body.chat.chat_id, CHAT_ID);
  assert.equal(response.body.chat.title, "Portfolio Governance");

  const update = state.queries.find(
    (query) => /UPDATE explanation_chats\b/.test(query.sql)
  );

  assert.ok(update, "Expected a database title update");
  assert.match(update.sql, /WHERE chat_id = \?\s+AND user_id = \?/);
  assert.deepEqual(update.params, [
    "Portfolio Governance",
    CHAT_ID,
    USER_ID
  ]);
});

test("Rename: normalizes surrounding and repeated whitespace", async () => {
  reset();

  const response = await invokeRename(
    "  Portfolio   Assessment   Notes  "
  );

  assert.equal(response.statusCode, 200);
  assert.equal(
    response.body.chat.title,
    "Portfolio Assessment Notes"
  );
});

test("Rename: rejects blank and non-string titles", async () => {
  for (const title of [undefined, null, 123, "", "  ", "\n\t"]) {
    reset();

    const response = await invokeRename(title);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.code, "INVALID_CHAT_TITLE");
    assert.equal(state.queries.length, 0);
  }
});

test("Rename: rejects titles longer than 255 characters", async () => {
  reset();

  const response = await invokeRename("A".repeat(256));

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, "INVALID_CHAT_TITLE");
  assert.equal(state.queries.length, 0);
});

test("Rename: protects the automatic New chat title", async () => {
  reset();

  const response = await invokeRename("New chat");

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, "RESERVED_CHAT_TITLE");
  assert.equal(state.queries.length, 0);
});

test("Rename: prevents another user changing a conversation", async () => {
  reset();

  const response = await invokeRename(
    "Unauthorized rename",
    CHAT_ID,
    USER_ID + 1
  );

  assert.equal(response.statusCode, 404);
  assert.equal(
    state.queries.some(
      (query) => /UPDATE explanation_chats\b/.test(query.sql)
    ),
    false
  );
});

test("Rename: rejects invalid conversation IDs", async () => {
  for (const chatId of [0, -1, "invalid"]) {
    reset();

    const response = await invokeRename("Valid title", chatId);

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.code, "INVALID_CHAT_ID");
    assert.equal(state.queries.length, 0);
  }
});

test("Rename: rejects conversations that do not exist", async () => {
  reset();

  const response = await invokeRename("New title", 999);

  assert.equal(response.statusCode, 404);
  assert.equal(
    state.queries.some(
      (query) => /UPDATE explanation_chats\b/.test(query.sql)
    ),
    false
  );
});
