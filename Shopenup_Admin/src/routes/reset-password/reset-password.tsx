import { zodResolver } from "@hookform/resolvers/zod"
import { Alert, Button, Input, toast } from "@shopenup/ui"
import { motion } from "motion/react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import * as z from "zod"

import { useState } from "react"
import { decodeToken } from "react-jwt"
import { Form } from "../../components/common/form"
import AvatarBox from "../../components/common/logo-box/avatar-box"
import { i18n } from "../../components/utilities/i18n"
import {
  useResetPasswordForEmailPass,
  useUpdateProviderForEmailPass,
} from "../../hooks/api/auth"

const ResetPasswordInstructionsSchema = z.object({
  email: z.string().email(),
})

const ResetPasswordSchema = z
  .object({
    password: z.string().min(1),
    repeat_password: z.string().min(1),
  })
  .superRefine(({ password, repeat_password }, ctx) => {
    if (password !== repeat_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: i18n.t("resetPassword.passwordMismatch"),
        path: ["repeat_password"],
      })
    }
  })

const ResetPasswordTokenSchema = z.object({
  entity_id: z.string(),
  provider: z.string(),
  exp: z.number(),
  iat: z.number(),
})

type DecodedResetPasswordToken = {
  entity_id: string // -> email in here
  provider: string
  exp: string
  iat: string
}

const validateDecodedResetPasswordToken = (
  decoded: any
): decoded is DecodedResetPasswordToken => {
  return ResetPasswordTokenSchema.safeParse(decoded).success
}

const InvalidResetToken = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  return (
    <div className="bg-gray-100 flex min-h-dvh w-dvw items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Clean White Card */}
        <motion.div
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <AvatarBox />
          
          {/* Title Section */}
          <div className="mb-8 text-center">
            <motion.h1 
              className="text-xl font-semibold text-gray-800 mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {t("resetPassword.invalidLinkTitle")}
            </motion.h1>
            <motion.p 
              className="text-gray-500 text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {t("resetPassword.invalidLinkHint")}
            </motion.p>
          </div>

          {/* Button Section */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              <Button
                onClick={() => navigate("/reset-password", { replace: true })}
                className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition-colors"
                type="submit"
              >
                {t("resetPassword.goToResetPassword")}
              </Button>
            </motion.div>
          </div>

          {/* Back to Login Link */}
          <motion.div 
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <span className="text-gray-600 text-sm">
              <Trans
                i18nKey="resetPassword.backToLogin"
                components={[
                  <Link
                    key="login-link"
                    to="/login"
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  />,
                ]}
              />
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

const ChooseNewPassword = ({ token }: { token: string }) => {
  const { t } = useTranslation()

  const [showAlert, setShowAlert] = useState(false)

  const invite: DecodedResetPasswordToken | null = token
    ? decodeToken(token)
    : null

  const isValidResetPasswordToken =
    invite && validateDecodedResetPasswordToken(invite)

  const form = useForm<z.infer<typeof ResetPasswordSchema>>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: {
      password: "",
      repeat_password: "",
    },
  })

  const { mutateAsync, isPending } = useUpdateProviderForEmailPass(token)

  const handleSubmit = form.handleSubmit(async ({ password }) => {
    if (!invite) {
      return
    }

    await mutateAsync(
      {
        password,
      },
      {
        onSuccess: () => {
          form.setValue("password", "")
          form.setValue("repeat_password", "")
          setShowAlert(true)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  if (!isValidResetPasswordToken) {
    return <InvalidResetToken />
  }

  return (
    <div className="bg-gray-100 flex min-h-dvh w-dvw items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Clean White Card */}
        <motion.div
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <AvatarBox />
          
          {/* Title Section */}
          <div className="mb-8 text-center">
            <motion.h1 
              className="text-xl font-semibold text-gray-800 mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {t("resetPassword.resetPassword")}
            </motion.h1>
            <motion.p 
              className="text-gray-500 text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {t("resetPassword.newPasswordHint")}
            </motion.p>
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Display */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <label className="text-sm font-medium text-gray-800 mb-2 block">
                    Email Address
                  </label>
                  <Input 
                    type="email" 
                    disabled 
                    value={invite?.entity_id}
                    className="h-11 px-3 border border-gray-300 rounded-md bg-gray-100 text-gray-600"
                  />
                </motion.div>

                {/* New Password */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <Form.Field
                    control={form.control}
                    name="password"
                    render={({ field }) => {
                      return (
                        <Form.Item>
                          <Form.Label className="text-sm font-medium text-gray-800 mb-2 block">
                            New Password
                          </Form.Label>
                          <Form.Control>
                            <Input
                              autoComplete="new-password"
                              type="password"
                              {...field}
                              className="h-11 px-3 border border-gray-300 rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                              placeholder={t("resetPassword.newPassword")}
                            />
                          </Form.Control>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )
                    }}
                  />
                </motion.div>

                {/* Repeat Password */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  <Form.Field
                    control={form.control}
                    name="repeat_password"
                    render={({ field }) => {
                      return (
                        <Form.Item>
                          <Form.Label className="text-sm font-medium text-gray-800 mb-2 block">
                            Confirm Password
                          </Form.Label>
                          <Form.Control>
                            <Input
                              autoComplete="off"
                              type="password"
                              {...field}
                              className="h-11 px-3 border border-gray-300 rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                              placeholder={t("resetPassword.repeatNewPassword")}
                            />
                          </Form.Control>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )
                    }}
                  />
                </motion.div>

                {/* Success Alert */}
                {showAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert 
                      dismissible 
                      variant="success"
                      className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium mb-1">
                          {t("resetPassword.successfulResetTitle")}
                        </span>
                        <span className="text-sm">{t("resetPassword.successfulReset")}</span>
                      </div>
                    </Alert>
                  </motion.div>
                )}

                {/* Submit Button */}
                {!showAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                  >
                    <Button 
                      className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors" 
                      type="submit" 
                      isLoading={isPending}
                    >
                      {t("resetPassword.resetPassword")}
                    </Button>
                  </motion.div>
                )}
              </form>
            </Form>
          </div>

          {/* Back to Login Link */}
          <motion.div 
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.9 }}
          >
            <span className="text-gray-600 text-sm">
              <Trans
                i18nKey="resetPassword.backToLogin"
                components={[
                  <Link
                    key="login-link"
                    to="/login"
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  />,
                ]}
              />
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export const ResetPassword = () => {
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [showAlert, setShowAlert] = useState(false)

  const token = searchParams.get("token")

  const form = useForm<z.infer<typeof ResetPasswordInstructionsSchema>>({
    resolver: zodResolver(ResetPasswordInstructionsSchema),
    defaultValues: {
      email: "",
    },
  })

  const { mutateAsync, isPending } = useResetPasswordForEmailPass()

  const handleSubmit = form.handleSubmit(async ({ email }) => {
    await mutateAsync(
      {
        email,
      },
      {
        onSuccess: () => {
          form.setValue("email", "")
          setShowAlert(true)
        },
        onError: (error) => {
          toast.error(error.message)
        },
      }
    )
  })

  if (token) {
    return <ChooseNewPassword token={token} />
  }

  return (
    <div className="bg-gray-100 flex min-h-dvh w-dvw items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Clean White Card */}
        <motion.div
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <AvatarBox />
          
          {/* Title Section */}
          <div className="mb-8 text-center">
            <motion.h1 
              className="text-xl font-semibold text-gray-800 mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {t("resetPassword.resetPassword")}
            </motion.h1>
            <motion.p 
              className="text-gray-500 text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {t("resetPassword.hint")}
            </motion.p>
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Email Input */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                >
                  <Form.Field
                    control={form.control}
                    name="email"
                    render={({ field }) => {
                      return (
                        <Form.Item>
                          <Form.Label className="text-sm font-medium text-gray-800 mb-2 block">
                            Email Address
                          </Form.Label>
                          <Form.Control>
                            <Input
                              autoComplete="email"
                              {...field}
                              className="h-11 px-3 border border-gray-300 rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                              placeholder={t("fields.email")}
                            />
                          </Form.Control>
                          <Form.ErrorMessage />
                        </Form.Item>
                      )
                    }}
                  />
                </motion.div>

                {/* Success Alert */}
                {showAlert && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert 
                      dismissible 
                      variant="success"
                      className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-lg"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium mb-1">
                          {t("resetPassword.successfulRequestTitle")}
                        </span>
                        <span className="text-sm">{t("resetPassword.successfulRequest")}</span>
                      </div>
                    </Alert>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 }}
                >
                  <Button 
                    className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors" 
                    type="submit" 
                    isLoading={isPending}
                  >
                    {t("resetPassword.sendResetInstructions")}
                  </Button>
                </motion.div>
              </form>
            </Form>
          </div>

          {/* Back to Login Link */}
          <motion.div 
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <span className="text-gray-600 text-sm">
              <Trans
                i18nKey="resetPassword.backToLogin"
                components={[
                  <Link
                    key="login-link"
                    to="/login"
                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors"
                  />,
                ]}
              />
            </span>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
