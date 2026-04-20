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
import { ReturnItemDefect } from "./models/return-item-defect"

export interface ReturnItemDefectDTO {
  id: string
  return_item_id: string
  defective_quantity: number
  image_url: string
  note?: string
  created_at?: Date
}

type ModuleOptions = {}

type InjectedDependencies = {}

class ReturnItemDefectModuleService extends ShopenupService({
  ReturnItemDefect
}) {
  protected options_?: ModuleOptions

  constructor({}: InjectedDependencies, options?: ModuleOptions) {
    super(...arguments)
    this.options_ = options
  }

  /**
   * Create a new defect record
   */
  async createDefect(
    data: Omit<ReturnItemDefectDTO, "id" | "created_at">
  ): Promise<ReturnItemDefectDTO> {
    const id = `defect_${Date.now()}_${Math.random().toString(36).substring(7)}`
    const created_at = new Date()

    const defect = await this.createReturnItemDefects({
      id,
      return_item_id: data.return_item_id,
      defective_quantity: data.defective_quantity,
      image_url: data.image_url,
      note: data.note || null,
      created_at,
    })

    return {
      id: defect.id,
      return_item_id: defect.return_item_id,
      defective_quantity: defect.defective_quantity,
      image_url: defect.image_url,
      note: defect.note || undefined,
      created_at: defect.created_at,
    }
  }

  /**
   * Get all defects for a specific return item
   */
  async getDefectsByReturnItemId(returnItemId: string): Promise<ReturnItemDefectDTO[]> {
    const defects = await this.listReturnItemDefects(
      {
        return_item_id: returnItemId,
      },
      {
        order: { created_at: "DESC" },
      }
    )

    return (defects || []).map((defect) => ({
      id: defect.id,
      return_item_id: defect.return_item_id,
      defective_quantity: defect.defective_quantity,
      image_url: defect.image_url,
      note: defect.note || undefined,
      created_at: defect.created_at,
    }))
  }

  /**
   * Get all defects for all items in a return
   * First gets return with items, then fetches defects for those items
   */
  async getDefectsByReturnId(returnId: string, container?: any): Promise<ReturnItemDefectDTO[]> {
    // Get return items using query service
    let returnItemIds: string[] = []
    
    if (container) {
      try {
        const query = container.resolve("query")
        // Query the return entity and access items through relation
        const { data: returns } = await query.graph({
          entity: "return",
          filters: {
            id: returnId,
          },
          fields: [
            "id",
            "items",
            "items.id",
          ],
        })
        
        // Extract item IDs from the return's items relation
        if (returns && returns.length > 0) {
          const returnData = returns[0]
          const items = returnData.items || []
          returnItemIds = items.map((item: any) => item.id).filter((id: string) => id)
        }
      } catch (error: any) {
        console.error("[getDefectsByReturnId] Error fetching return items:", error)
        // Fallback: return empty array if query fails
        return []
      }
    }
    
    // If no return items found, return empty array
    if (returnItemIds.length === 0) {
      return []
    }
    
    // Get all defects for these return items
    const allDefects: ReturnItemDefectDTO[] = []
    
    for (const returnItemId of returnItemIds) {
      const defects = await this.getDefectsByReturnItemId(returnItemId)
      allDefects.push(...defects)
    }
    
    // Sort by created_at descending
    return allDefects.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })
  }

  /**
   * Delete a defect record
   */
  async deleteDefect(defectId: string): Promise<void> {
    await this.deleteReturnItemDefects(defectId)
  }
}

export default ReturnItemDefectModuleService
