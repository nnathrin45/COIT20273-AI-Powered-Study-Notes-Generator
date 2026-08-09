function ComingSoon({ title }) {
  return (
    <div className="mx-auto max-w-7xl">
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-gray-900">
          {title}
        </h1>

        <p className="mt-3 text-gray-600">
          This feature will be implemented in the next development stage.
        </p>
      </div>
    </div>
  )
}

export default ComingSoon