// import { ShopenupService } from "@shopenup/framework/utils"
// import { InferTypeOf } from "@shopenup/framework/types"
// import { ShiprocketReturn } from "../models/shiprocket-return"

// type ShiprocketReturnEntity = InferTypeOf<typeof ShiprocketReturn>

// class ShiprocketReturnService extends ShopenupService({
//     shiprocket_return: ShiprocketReturn,
// }) {
//     static identifier = "shiprocketReturnService"
//     async create(data: Partial<ShiprocketReturnEntity>) {
//         return await this.createShiprocket_returns(data)
//     }

//     async updateByReturnId(
//         returnId: string,
//         data: Partial<ShiprocketReturnEntity>
//     ) {
//         const returns = await this.listShiprocket_returns({
//             return_id: returnId,
//         })

//         if (!returns.length) return null

//         return await this.updateShiprocket_returns(data)
//     }

//     async getByReturnId(returnId: string) {
//         const returns = await this.listShiprocket_returns({
//             return_id: returnId,
//         })

//         return returns[0] || null
//     }
// }

// export default ShiprocketReturnService
