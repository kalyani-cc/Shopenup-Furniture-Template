/*
 * Copyright 2024 Shopenup, https://shopenup.com/
 *
 * MIT License
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ShopenupService } from "@shopenup/framework/utils"
import { ShiprocketReturn } from "./models/shiprocket-return"

/**
 * DTO used by the service
 */
export interface ShiprocketReturnDTO {
  id: string
  order_id: string
  return_id: string

  shiprocket_return_id?: string
  shiprocket_shipment_id?: string
  awb_code?: string

  courier_company?: string
  courier_company_id?: string

  return_status?: string
  pickup_status?: string
  shipment_status?: string

  pickup_scheduled_date?: Date
  shipped_at?: Date
  delivered_at?: Date

  label_url?: string
  invoice_url?: string
  tracking_url?: string

  create_payload?: Record<string, any>
  create_response?: Record<string, any>
  webhook_payloads?: Record<string, any>
  metadata?: Record<string, any>

  error_message?: string
  retry_count?: number
}

type ModuleOptions = {}

type InjectedDependencies = {}

class ShiprocketReturnModuleService extends ShopenupService({
  ShiprocketReturn,
}) {
  protected options_?: ModuleOptions

  constructor({}: InjectedDependencies, options?: ModuleOptions) {
    super(...arguments)
    this.options_ = options
  }

  /**
   * Create Shiprocket return entry
   */
  async createReturn(
    data: Omit<ShiprocketReturnDTO, "id">
  ): Promise<ShiprocketReturnDTO> {
    const id = `sr_return_${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}`

    const result = await this.createShiprocketReturns({
      id,
      ...data,
      retry_count: data.retry_count ?? 0,
    })

    return result as ShiprocketReturnDTO
  }

  /**
   * Get Shiprocket return by Medusa return_id
   */
  async getByReturnId(returnId: string): Promise<ShiprocketReturnDTO | null> {
    const results = await this.listShiprocketReturns({
      return_id: returnId,
    })

    return results?.[0] || null
  }

  /**
   * Update Shiprocket return using return_id
   */
  async updateByReturnId(
    returnId: string,
    data: Partial<ShiprocketReturnDTO>
  ): Promise<ShiprocketReturnDTO | null> {
    const existing = await this.getByReturnId(returnId)

    if (!existing) {
      return null
    }

    const updated = await this.updateShiprocketReturns({ id: existing.id, ...data })

    return updated as ShiprocketReturnDTO
  }

  /**
   * Update Shiprocket return by AWB code
   * (Useful for webhook updates)
   */
  async updateByAwbCode(
    awbCode: string,
    data: Partial<ShiprocketReturnDTO>
  ): Promise<ShiprocketReturnDTO | null> {
    const results = await this.listShiprocketReturns({
      awb_code: awbCode,
    })

    if (!results.length) {
      return null
    }

    const updated = await this.updateShiprocketReturns({ id: results[0].id, ...data } as ShiprocketReturnDTO)

    return updated as ShiprocketReturnDTO
  }

  /**
   * Delete Shiprocket return entry
   */
  async deleteReturn(id: string): Promise<void> {
    await this.deleteShiprocketReturns(id)
  }
}

export default ShiprocketReturnModuleService
