import { zodResolver } from "@hookform/resolvers/zod"
import { Alert, Button, Hint, Input } from "@shopenup/ui"
import { motion } from "motion/react"
import { useForm } from "react-hook-form"
import { Trans, useTranslation } from "react-i18next"
import { Link, useLocation, useNavigate } from "react-router-dom"
import * as z from "zod"

import { Form } from "../../components/common/form"
import AvatarBox from "../../components/common/logo-box/avatar-box"
import { useSignInWithEmailPass } from "../../hooks/api"
import { isFetchError } from "../../lib/is-fetch-error"
import { useExtension } from "../../providers/extension-provider"
import { queryClient } from "../../lib/query-client"

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export const Login = () => {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { getWidgets } = useExtension()

  const from = location.state?.from?.pathname || "/dashboard"

  const form = useForm<z.infer<typeof LoginSchema>>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const { mutateAsync, isPending } = useSignInWithEmailPass()

  const handleSubmit = form.handleSubmit(async ({ email, password }) => {
    await mutateAsync(
      {
        email,
        password,
      },
      {
        onError: (error) => {
          if (isFetchError(error)) {
            if (error.status === 401) {
              form.setError("email", {
                type: "manual",
                message: error.message,
              })

              return
            }
          }

          form.setError("root.serverError", {
            type: "manual",
            message: error.message,
          })
        },
        onSuccess: async () => {
          try {
            // Invalidate queries to ensure fresh data after login
            queryClient.invalidateQueries()
            
            // Small delay to ensure cookies are set before navigating
            await new Promise(resolve => setTimeout(resolve, 100))
            
            navigate(from, { replace: true })
          } catch (error) {
            console.error('❌ [login] Error in onSuccess callback:', error);
            // Still navigate even if invalidation fails
            navigate(from, { replace: true })
          }
        },
      }
    )
  })

  const serverError = form.formState.errors?.root?.serverError?.message
  const validationError =
    form.formState.errors.email?.message ||
    form.formState.errors.password?.message

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
          
          {/* Welcome Section */}
          <div className="mb-8 text-center">
            <motion.h1 
              className="text-xl font-semibold text-gray-800 mb-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              {t("login.title")}
            </motion.h1>
            <motion.p 
              className="text-gray-500 text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {t("login.hint")}
            </motion.p>
          </div>
          {/* Form Section */}
          <div className="space-y-6">
            {getWidgets("login.before").map((Component, i) => {
              return <Component key={i} />
            })}
            
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Input Fields */}
                <div className="space-y-5">
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
                          </Form.Item>
                        )
                      }}
                    />
                  </motion.div>
                  
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
                              Password
                            </Form.Label>
                            <Form.Control>
                              <Input
                                type="password"
                                autoComplete="current-password"
                                {...field}
                                className="h-11 px-3 border border-gray-300 rounded-md bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white transition-colors"
                                placeholder={t("fields.password")}
                              />
                            </Form.Control>
                          </Form.Item>
                        )
                      }}
                    />
                  </motion.div>
                </div>

                {/* Error Messages */}
                {validationError && (
                  <motion.div
                    className="text-center"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Hint className="inline-flex" variant={"error"}>
                      {validationError}
                    </Hint>
                  </motion.div>
                )}
                
                {serverError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Alert
                      className="bg-red-50 border border-red-200 text-red-800 items-center p-3 rounded-lg"
                      dismissible
                      variant="error"
                    >
                      {serverError}
                    </Alert>
                  </motion.div>
                )}

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                >
                  <Button 
                    className="w-full h-11 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition-colors" 
                    type="submit" 
                    isLoading={isPending}
                  >
                    Login
                  </Button>
                </motion.div>
              </form>
            </Form>
            
            {getWidgets("login.after").map((Component, i) => {
              return <Component key={i} />
            })}
          </div>

          {/* Forgot Password Link */}
          <motion.div 
            className="text-center mt-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <span className="text-gray-600 text-sm">
              <Trans
                i18nKey="login.forgotPassword"
                components={[
                  <Link
                    key="reset-password-link"
                    to="/reset-password"
                    className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
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
