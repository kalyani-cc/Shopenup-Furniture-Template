import { 
    ModuleProvider, 
    Modules,
  } from "@shopenup/framework/utils";
import { TwilioSmsService } from "./service";
  
  export default ModuleProvider(Modules.NOTIFICATION, {
    services: [TwilioSmsService],
  })