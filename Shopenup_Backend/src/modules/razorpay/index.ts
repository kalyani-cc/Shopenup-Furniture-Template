import { ModuleProvider, Modules } from "@shopenup/framework/utils";
import RazorpayService from "./service";

export default ModuleProvider(Modules.PAYMENT, {
  services: [RazorpayService],
});