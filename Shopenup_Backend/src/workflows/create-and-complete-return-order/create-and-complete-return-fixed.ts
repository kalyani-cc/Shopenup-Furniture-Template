import {
    createWorkflow,
    WorkflowResponse,
    transform,
  } from "@shopenup/workflows-sdk"
  
  import {
    createAndCompleteReturnOrderWorkflow,
  } from "@shopenup/core-flows"
  
  export const createAndCompleteReturnOrderFixedWorkflowId =
    "create-and-complete-return-order-fixed"
  
  export const createAndCompleteReturnOrderFixedWorkflow =
    createWorkflow(
      createAndCompleteReturnOrderFixedWorkflowId,
      function (input) {
  console.log("input---", input);
        // ✅ transform returns WorkflowData — DO NOT read it
        const fixedItems = transform(
          input,
          (data: any) =>
            (data?.items ?? []).map((item: any) => ({
              ...item,
              reason_id: Array.isArray(item.reason_id)
                ? item.reason_id[0]
                : item.reason_id,
            }))
        )
        console.log("fixedItems---", fixedItems);
        const fixedItems2 = transform(input, (data: any) => {
            console.log("RAW ITEMS", data?.items)
            return data.items.map((item: any) => ({
              ...item,
              reason_id: Array.isArray(item.reason_id)
                ? item.reason_id[0]
                : item.reason_id,
            }))
          })
          console.log("fixedItems2---", fixedItems2);
        // ✅ Spread input first, override items last
        const result =
          createAndCompleteReturnOrderWorkflow.runAsStep({
            ...(input as any),
            items: fixedItems,
          })
  
        return new WorkflowResponse(result)
      }
    )
  