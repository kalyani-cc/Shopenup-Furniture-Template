import { Module } from "@shopenup/framework/utils"
import ReturnItemDefectModuleService from "./service"
import { ReturnItemDefect } from "./models/return-item-defect"

export const RETURN_ITEM_DEFECT_MODULE = "returnItemDefectModuleService"

export default Module(RETURN_ITEM_DEFECT_MODULE, {
  service: ReturnItemDefectModuleService,
})

// Export the entity for use in migrations
export { ReturnItemDefect }
