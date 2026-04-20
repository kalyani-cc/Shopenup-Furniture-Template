import { LoaderFunctionArgs } from "react-router-dom"

import { workflowExecutionsQueryKeys } from "../../../hooks/api/workflow-executions"
import { sdk } from "../../../lib/client"
import { queryClient } from "../../../lib/query-client"

const executionDetailQuery = (id: string) => ({
  queryKey: workflowExecutionsQueryKeys.detail(id),
  queryFn: async () => sdk.admin.workflowExecution.retrieve(id),
})

export const workflowExecutionLoader = async ({
  params,
}: LoaderFunctionArgs) => {
  try {
    const id = params.id
    const query = executionDetailQuery(id!)

    return await queryClient.ensureQueryData(query)
  } catch (error) {
    console.error('❌ [workflow-execution-loader] Error loading workflow execution:', error);
    throw error; // Re-throw to let React Router handle it
  }
}
