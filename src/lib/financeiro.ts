import FinanceiroSDK from "./financeiro-sdk";

export const sdk = new FinanceiroSDK({
  tenantId: "obsidian",
  // apiKey: "SE_USAR_AUTH", // optional
  // baseUrl: "https://docker-n8n-webhook.q4xusi.easypanel.host/webhook" // default already this
});

export default sdk;