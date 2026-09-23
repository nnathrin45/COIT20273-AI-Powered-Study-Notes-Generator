import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  deleteProfilePicture,
  getProfilePicture,
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  changeUserPassword,
} from '../services/profileService'


function Profile() {
    const fileInputRef = useRef(null)

    const [profile, setProfile] =
        useState(null)

    const [fullName, setFullName] =
        useState('')

    const [pictureUrl, setPictureUrl] =
        useState(null)

    const [initialLoading, setInitialLoading] =
        useState(true)

    const [saving, setSaving] =
        useState(false)

    const [photoLoading, setPhotoLoading] =
        useState(false)

    const [error, setError] =
        useState('')

    const [success, setSuccess] =
        useState('')

    const [currentPassword, setCurrentPassword] =
    useState('')

    const [newPassword, setNewPassword] =
    useState('')

    const [
    confirmNewPassword,
    setConfirmNewPassword,
    ] = useState('')

    const [
    passwordLoading,
    setPasswordLoading,
    ] = useState(false)

    const [
    passwordError,
    setPasswordError,
    ] = useState('')

    const [
    passwordSuccess,
    setPasswordSuccess,
    ] = useState('')

  useEffect(() => {
    const loadProfile = async () => {
      setInitialLoading(true)
      setError('')

      try {
        const response =
          await getUserProfile()

        if (!response.ok) {
          setError(
            response.data?.message ||
              'Unable to retrieve your profile.'
          )
          return
        }

        const user =
          response.data?.user ?? null

        setProfile(user)

        setFullName(
          user?.full_name ?? ''
        )

        if (user?.profile_picture) {
          const pictureResponse =
            await getProfilePicture()

          if (
            pictureResponse.ok &&
            pictureResponse.blob
          ) {
            setPictureUrl(
              URL.createObjectURL(
                pictureResponse.blob
              )
            )
          }
        }
      } catch (loadError) {
        console.error(
          'Profile fetch error:',
          loadError
        )

        setError(
          'Unable to connect to the server to retrieve your profile.'
        )
      } finally {
        setInitialLoading(false)
      }
    }

    loadProfile()
  }, [])


  useEffect(() => {
    return () => {
      if (pictureUrl) {
        URL.revokeObjectURL(
          pictureUrl
        )
      }
    }
  }, [pictureUrl])


  const handleSaveProfile = async (
    event
  ) => {
    event.preventDefault()

    const cleanedName =
      fullName.trim()

    setError('')
    setSuccess('')

    if (!cleanedName) {
      setError(
        'Full name is required.'
      )
      return
    }

    if (cleanedName.length > 255) {
      setError(
        'Full name must not exceed 255 characters.'
      )
      return
    }

    setSaving(true)

    try {
      const response =
        await updateUserProfile(
          cleanedName
        )

      if (!response.ok) {
        setError(
          response.data?.message ||
            'Unable to update your profile.'
        )
        return
      }

      const updatedUser =
        response.data?.user

      if (updatedUser) {
        setProfile(updatedUser)
        setFullName(
          updatedUser.full_name ?? ''
        )
      }

      window.dispatchEvent(
        new Event('profile-updated')
      )

      setSuccess(
        'Profile updated successfully.'
      )
    } catch (updateError) {
      console.error(
        'Profile update error:',
        updateError
      )

      setError(
        'Unable to connect to the server to update your profile.'
      )
    } finally {
      setSaving(false)
    }
  }


  const handlePhotoChange = async (
    event
  ) => {
    const file =
      event.target.files?.[0]

    if (!file) return

    setError('')
    setSuccess('')

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ]

    if (
      !allowedTypes.includes(
        file.type
      )
    ) {
      setError(
        'Please select a JPG, PNG or WebP image.'
      )

      event.target.value = ''
      return
    }

    if (
      file.size >
      2 * 1024 * 1024
    ) {
      setError(
        'Profile picture must not exceed 2 MB.'
      )

      event.target.value = ''
      return
    }

    setPhotoLoading(true)

    try {
      const uploadResponse =
        await uploadProfilePicture(
          file
        )

      if (!uploadResponse.ok) {
        setError(
          uploadResponse.data?.message ||
            'Unable to upload your profile picture.'
        )
        return
      }

      const pictureResponse =
        await getProfilePicture()

      if (
        pictureResponse.ok &&
        pictureResponse.blob
      ) {
        setPictureUrl(
          URL.createObjectURL(
            pictureResponse.blob
          )
        )
      }

      setProfile((current) => ({
        ...current,
        profile_picture:
          uploadResponse.data
            ?.profile_picture ?? null,
      }))

      window.dispatchEvent(
        new Event('profile-updated')
      )

      setSuccess(
        'Profile picture updated successfully.'
      )
    } catch (uploadError) {
      console.error(
        'Profile picture upload error:',
        uploadError
      )

      setError(
        'Unable to connect to the server to upload your profile picture.'
      )
    } finally {
      setPhotoLoading(false)

      if (fileInputRef.current) {
        fileInputRef.current.value =
          ''
      }
    }
  }


  const handleRemovePhoto =
    async () => {
      setError('')
      setSuccess('')
      setPhotoLoading(true)

      try {
        const response =
          await deleteProfilePicture()

        if (!response.ok) {
          setError(
            response.data?.message ||
              'Unable to remove your profile picture.'
          )
          return
        }

        setPictureUrl(null)

        setProfile((current) => ({
          ...current,
          profile_picture: null,
        }))

        window.dispatchEvent(
            new Event('profile-updated')
        )

        setSuccess(
          'Profile picture removed successfully.'
        )

      } catch (deleteError) {
        console.error(
          'Profile picture delete error:',
          deleteError
        )

        setError(
          'Unable to connect to the server to remove your profile picture.'
        )
      } finally {
        setPhotoLoading(false)
      }
    }

    const handlePasswordChange = async (
        event
        ) => {
        event.preventDefault()

        setPasswordError('')
        setPasswordSuccess('')

        if (
            !currentPassword ||
            !newPassword ||
            !confirmNewPassword
        ) {
            setPasswordError(
            'Please complete all password fields.'
            )
            return
        }

        if (newPassword.length < 8) {
            setPasswordError(
            'New password must be at least 8 characters long.'
            )
            return
        }

        if (
            newPassword !==
            confirmNewPassword
        ) {
            setPasswordError(
            'New password and confirmation do not match.'
            )
            return
        }

        if (
            currentPassword ===
            newPassword
        ) {
            setPasswordError(
            'New password must be different from your current password.'
            )
            return
        }

        setPasswordLoading(true)

        try {
            const response =
            await changeUserPassword(
                currentPassword,
                newPassword
            )

            if (!response.ok) {
            setPasswordError(
                response.data?.message ||
                'Unable to change your password.'
            )
            return
            }

            setCurrentPassword('')
            setNewPassword('')
            setConfirmNewPassword('')

            setPasswordSuccess(
            'Password changed successfully.'
            )
        } catch (error) {
            console.error(
            'Password change error:',
            error
            )

            setPasswordError(
            'Unable to connect to the server to change your password.'
            )
        } finally {
            setPasswordLoading(false)
        }
        }

  const profileInitial =
    profile?.full_name
      ?.trim()
      ?.charAt(0)
      ?.toUpperCase() || 'S'


  if (initialLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl">

        <div
          className="flex items-center gap-3 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6"
          role="status"
        >
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#a97cff]/30 border-t-[#a97cff]" />

          <p className="text-sm font-medium text-[#c9b4ff]">
            Loading your profile...
          </p>
        </div>

      </div>
    )
  }


  return (
    <div className="mx-auto w-full max-w-4xl">

      {/* Page Header */}
      <div className="mb-8">

        <p className="mb-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#a97cff]">
          Account
        </p>

        <h1 className="text-3xl font-bold tracking-tight text-[#f3f0ff]">
          Profile Settings
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#898cc0]">
          Manage your personal information and
          profile picture.
        </p>

      </div>


      {/* Messages */}
      {error && (
        <div
          className="mb-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
          role="alert"
        >
          <p className="text-sm text-red-300">
            {error}
          </p>
        </div>
      )}

      {success && (
        <div
          className="mb-5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-4"
          role="status"
        >
          <p className="text-sm text-emerald-300">
            {success}
          </p>
        </div>
      )}


      {/* Profile Photo */}
      <section className="mb-6 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6">

        <div className="mb-6">

          <h2 className="text-lg font-semibold text-[#f3f0ff]">
            Profile Photo
          </h2>

          <p className="mt-1 text-sm text-[#898cc0]">
            Choose a photo that will appear
            with your account.
          </p>

        </div>

        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">

          {/* Avatar */}
          <div className="relative">

            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-[#7a44ff]/40 bg-gradient-to-br from-[#7a44ff] to-[#d83dff] shadow-[0_10px_30px_rgba(122,68,255,0.2)]">

              {pictureUrl ? (
                <img
                  src={pictureUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-4xl font-bold text-white">
                  {profileInitial}
                </span>
              )}

            </div>

            <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-[#160b32] bg-emerald-400" />

          </div>


          {/* Photo Actions */}
          <div>

            <div className="flex flex-wrap gap-3">

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={
                  handlePhotoChange
                }
                className="hidden"
              />

              <button
                type="button"
                disabled={photoLoading}
                onClick={() =>
                  fileInputRef.current?.click()
                }
                className="rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#d83dff] px-4 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {photoLoading
                  ? 'Processing...'
                  : pictureUrl
                    ? 'Change Photo'
                    : 'Upload Photo'}
              </button>

              {pictureUrl && (
                <button
                  type="button"
                  disabled={photoLoading}
                  onClick={
                    handleRemovePhoto
                  }
                  className="rounded-lg border border-red-400/25 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Remove Photo
                </button>
              )}

            </div>

            <p className="mt-3 text-xs leading-5 text-[#727494]">
              JPG, PNG or WebP. Maximum file
              size 2 MB.
            </p>

          </div>

        </div>

      </section>


      {/* Account Information */}
      <section className="mb-6 rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6">

        <div className="mb-6">

          <h2 className="text-lg font-semibold text-[#f3f0ff]">
            Account Information
          </h2>

          <p className="mt-1 text-sm text-[#898cc0]">
            Update the name associated with
            your account.
          </p>

        </div>

        <form
          onSubmit={handleSaveProfile}
          className="space-y-5"
        >

          {/* Full Name */}
          <div>

            <label
              htmlFor="profile-full-name"
              className="mb-2 block text-sm font-medium text-[#c9b4ff]"
            >
              Full Name
            </label>

            <input
              id="profile-full-name"
              type="text"
              value={fullName}
              maxLength={255}
              onChange={(event) =>
                setFullName(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-[#2a1b4d] bg-[#120928] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#5f6285] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/20"
              placeholder="Enter your full name"
            />

          </div>


          {/* Email */}
          <div>

            <label
              htmlFor="profile-email"
              className="mb-2 block text-sm font-medium text-[#c9b4ff]"
            >
              Email Address
            </label>

            <input
              id="profile-email"
              type="email"
              value={
                profile?.email ?? ''
              }
              readOnly
              className="w-full cursor-not-allowed rounded-lg border border-[#2a1b4d] bg-[#191426] px-4 py-3 text-sm text-[#898cc0] outline-none"
            />

            <p className="mt-2 text-xs text-[#727494]">
              Your email address cannot be
              changed from Profile Settings.
            </p>

          </div>


          {/* Member Since */}
          {profile?.created_at && (
            <div>

              <p className="mb-2 text-sm font-medium text-[#c9b4ff]">
                Member Since
              </p>

              <div className="rounded-lg border border-[#2a1b4d] bg-[#191426] px-4 py-3 text-sm text-[#898cc0]">
                {new Date(
                  profile.created_at
                ).toLocaleDateString(
                  'en-AU',
                  {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }
                )}
              </div>

            </div>
          )}


          {/* Save */}
          <div className="flex justify-end pt-2">

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#d83dff] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Saving...'
                : 'Save Changes'}
            </button>

          </div>

        </form>

      </section>


      {/* Account Security */}
        <section className="rounded-xl border border-[#2a1b4d] bg-[#160b32] p-6">

        <div className="mb-6">

            <h2 className="text-lg font-semibold text-[#f3f0ff]">
            Account Security
            </h2>

            <p className="mt-1 text-sm text-[#898cc0]">
            Change your account password securely.
            </p>

        </div>

        {passwordError && (
            <div
            className="mb-5 rounded-lg border border-red-400/25 bg-red-500/10 p-4"
            role="alert"
            >
            <p className="text-sm text-red-300">
                {passwordError}
            </p>
            </div>
        )}

        {passwordSuccess && (
            <div
            className="mb-5 rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-4"
            role="status"
            >
            <p className="text-sm text-emerald-300">
                {passwordSuccess}
            </p>
            </div>
        )}

        <form
            onSubmit={handlePasswordChange}
            className="space-y-5"
        >

            <div>
            <label
                htmlFor="current-password"
                className="mb-2 block text-sm font-medium text-[#c9b4ff]"
            >
                Current Password
            </label>

            <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(event) =>
                setCurrentPassword(
                    event.target.value
                )
                }
                autoComplete="current-password"
                className="w-full rounded-lg border border-[#2a1b4d] bg-[#120928] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#5f6285] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/20"
                placeholder="Enter your current password"
            />
            </div>

            <div>
            <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-medium text-[#c9b4ff]"
            >
                New Password
            </label>

            <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) =>
                setNewPassword(
                    event.target.value
                )
                }
                autoComplete="new-password"
                className="w-full rounded-lg border border-[#2a1b4d] bg-[#120928] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#5f6285] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/20"
                placeholder="Enter a new password"
            />

            <p className="mt-2 text-xs text-[#727494]">
                Password must be at least 8 characters long.
            </p>
            </div>

            <div>
            <label
                htmlFor="confirm-new-password"
                className="mb-2 block text-sm font-medium text-[#c9b4ff]"
            >
                Confirm New Password
            </label>

            <input
                id="confirm-new-password"
                type="password"
                value={confirmNewPassword}
                onChange={(event) =>
                setConfirmNewPassword(
                    event.target.value
                )
                }
                autoComplete="new-password"
                className="w-full rounded-lg border border-[#2a1b4d] bg-[#120928] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#5f6285] focus:border-[#7a44ff] focus:ring-2 focus:ring-[#7a44ff]/20"
                placeholder="Confirm your new password"
            />
            </div>

            <div className="flex justify-end pt-2">

            <button
                type="submit"
                disabled={passwordLoading}
                className="rounded-lg bg-gradient-to-r from-[#7a44ff] to-[#d83dff] px-5 py-2.5 text-sm font-semibold text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {passwordLoading
                ? 'Changing...'
                : 'Change Password'}
            </button>

            </div>

        </form>

        </section>

    </div>
  )
}

export default Profile