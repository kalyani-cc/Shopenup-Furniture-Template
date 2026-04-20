import { ExecArgs, IRegionModuleService } from '@shopenup/framework/types';
import { ContainerRegistrationKeys, Modules } from '@shopenup/framework/utils';

/**
 * Script to enable Razorpay payment provider for all regions
 * 
 * Run this script using: npm run dev:scripts enable-razorpay
 */
export default async function enableRazorpay({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve('query');
  const regionModuleService: IRegionModuleService = container.resolve(Modules.REGION);

  try {
    logger.info('🔍 Fetching all regions...');
    
    // Fetch all regions with their payment providers
    const { data: regions } = await query.graph({
      entity: 'region',
      fields: ['id', 'name', 'currency_code', '*payment_providers'],
    });

    if (!regions || regions.length === 0) {
      logger.warn('⚠️ No regions found');
      return;
    }

    logger.info(`📋 Found ${regions.length} region(s)`);

    // Razorpay provider ID format (framework converts "razorpay" to "pp_razorpay_razorpay")
    const razorpayProviderId = 'pp_razorpay_razorpay';

    for (const region of regions) {
      const currentProviders = region.payment_providers?.map((pp: any) => pp.id) || [];
      
      // Check if Razorpay is already enabled
      if (currentProviders.includes(razorpayProviderId)) {
        logger.info(`✅ Razorpay already enabled for region: ${region.name} (${region.id})`);
        continue;
      }

      // Add Razorpay to the payment providers list
      const updatedProviders = [...currentProviders, razorpayProviderId];
      
      logger.info(`🔄 Updating region: ${region.name} (${region.id})`);
      logger.info(`   Current providers: ${currentProviders.join(', ') || 'none'}`);
      logger.info(`   Adding: ${razorpayProviderId}`);
      
      try {
        // Update the region with Razorpay enabled
        // Note: payment_providers is handled via API layer, using type assertion here
        await regionModuleService.updateRegions(
          region.id,
          { payment_providers: updatedProviders } as any
        );
        
        logger.info(`✅ Successfully enabled Razorpay for region: ${region.name}`);
      } catch (error: any) {
        logger.error(`❌ Failed to update region ${region.name}: ${error.message}`);
        console.error(error);
      }
    }

    logger.info('✨ Script completed!');
  } catch (error: any) {
    logger.error(`❌ Script failed: ${error.message}`);
    console.error(error);
    throw error;
  }
}

