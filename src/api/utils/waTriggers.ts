import { drizzle } from 'drizzle-orm/d1';
import { settings } from '../db/schema';
import { whatsappService } from '../services/whatsappService';

export async function sendAutoWAMessage(dbBinding: D1Database, number: string, text: string) {
  const db = drizzle(dbBinding);
  const allSettings = await db.select().from(settings);
  
  const config = {
    baseUrl: allSettings.find(s => s.key === 'wa_base_url')?.value,
    apiKey: allSettings.find(s => s.key === 'wa_api_key')?.value,
    instanceName: allSettings.find(s => s.key === 'wa_instance_name')?.value,
  };

  if (config.baseUrl && config.apiKey && config.instanceName) {
    return await whatsappService.sendMessage({
      baseUrl: config.baseUrl,
      apiKey: config.apiKey,
      instanceName: config.instanceName,
      number,
      text,
    });
  }
  
  console.warn('WhatsApp triggers skipped: Config incomplete');
  return null;
}
