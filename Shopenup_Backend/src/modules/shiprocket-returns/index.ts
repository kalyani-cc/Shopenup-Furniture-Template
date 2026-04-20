
import { Module } from "@shopenup/framework/utils"
import ShiprocketReturnService from "./service"
import { ShiprocketReturn } from "./models/shiprocket-return"

export const SHIPROCKET_RETURN_MODULE = "shiprocketReturnService"


export default Module(SHIPROCKET_RETURN_MODULE, {
  service: ShiprocketReturnService,
})

export { ShiprocketReturn}