export interface SendMessageParams {
  instanceName: string;
  number: string;
  text: string;
  apiKey: string;
  baseUrl: string;
}

export const whatsappService = {
  async sendMessage({ instanceName, number, text, apiKey, baseUrl }: SendMessageParams) {
    // Sanitize number (must be in 62xxx format for Indonesia)
    const sanitizedNumber = number.replace(/[^0-9]/g, '');
    const finalNumber = sanitizedNumber.startsWith('0') 
      ? '62' + sanitizedNumber.slice(1) 
      : sanitizedNumber;

    try {
      const response = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
        body: JSON.stringify({
          number: finalNumber,
          text: text, // Evolution v2 uses 'text' directly
        }),
      });

      const result: any = await response.json();
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || result.error || JSON.stringify(result) };
      }
    } catch (error: any) {
      console.error('WhatsApp Service Error:', error);
      return { success: false, error: error.message || 'Network Error' };
    }
  },

  async logout({ instanceName, apiKey, baseUrl }: { instanceName: string; apiKey: string; baseUrl: string }) {
    try {
      const response = await fetch(`${baseUrl}/instance/logout/${instanceName}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': apiKey,
        },
      });

      const result: any = await response.json();
      if (response.ok) {
        return { success: true, data: result };
      } else {
        return { success: false, error: result.message || result.error || 'Failed to logout' };
      }
    } catch (error: any) {
      console.error('WhatsApp Logout Error:', error);
      return { success: false, error: error.message || 'Network Error' };
    }
  },
};
