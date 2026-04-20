import { shopenupIntegrationTestRunner } from "shopenup-test-utils"
jest.setTimeout(60 * 1000)

shopenupIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api }) => {
    describe("Ping", () => {
      it("ping the server health endpoint", async () => {
        const response = await api.get('/health')
        expect(response.status).toEqual(200)
      })
    })
  },
})