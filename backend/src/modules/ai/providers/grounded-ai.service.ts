import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { AiProvider, ShopAiContext, AiAnswerResult } from './ai-provider.interface';

@Injectable()
export class GroundedAiService implements AiProvider {
  private readonly logger = new Logger(GroundedAiService.name);

  async answerQuestion(
    question: string,
    context: ShopAiContext,
    customerLanguage: string = 'am',
  ): Promise<AiAnswerResult> {
    const qLower = question.toLowerCase().trim();
    const isAmharic = customerLanguage === 'am';

    // 1. Check approved merchant rules first (FR-43)
    for (const rule of context.rules) {
      const pattern = rule.questionPattern.toLowerCase();
      if (qLower.includes(pattern) || pattern.includes(qLower)) {
        return {
          text: `AI assistant · የሱቅ ረዳት\n${rule.approvedAnswer}`,
          isConfident: true,
          isEscalated: false,
          source: 'SHOP_RULE',
        };
      }
    }

    // 2. Deterministic Grounded Database lookups (Acceptance Test 2)
    // Check for Price inquiry
    const priceKeywords = ['price', 'how much', 'cost', 'ዋጋ', 'ዋጋው', 'ስንት', 'ስንት ነው'];
    const isPriceQuery = priceKeywords.some((k) => qLower.includes(k));

    // Check for Stock inquiry
    const stockKeywords = ['stock', 'available', 'size', 'have', 'አለ', 'አላችሁ', 'አለ ወይ', 'መጠን', 'ሳይዝ'];
    const isStockQuery = stockKeywords.some((k) => qLower.includes(k));

    // Check for Hours inquiry (handling both ዓ/አ and inflections like ሰዓታችሁ)
    const hoursKeywords = ['hours', 'open', 'close', 'time', 'ሰዓት', 'ሰአት', 'ሰዓታ', 'ሰአታ', 'ስራ ሰዓት', 'የስራ', 'መቼ', 'ክፍት'];
    const isHoursQuery = hoursKeywords.some((k) => qLower.includes(k));

    // Check for Location inquiry
    const locationKeywords = ['where', 'location', 'area', 'address', 'የት', 'የት ነው', 'አድራሻ', 'ቦታ', 'አካባቢ', 'መገኛ'];
    const isLocationQuery = locationKeywords.some((k) => qLower.includes(k));

    // Find any mentioned product in context
    const matchedProduct = context.products.find((p) => {
      const pNameLower = p.name.toLowerCase();
      if (qLower.includes(pNameLower) || pNameLower.includes(qLower)) return true;
      const significantWords = pNameLower.split(/\s+/).filter((w) => w.length >= 4);
      return significantWords.some((w) => qLower.includes(w));
    });

    if (isPriceQuery && matchedProduct) {
      const reply = isAmharic
        ? `የ${matchedProduct.name} ዋጋ ${matchedProduct.price} የኢትዮጵያ ብር (ETB) ነው።`
        : `The price of ${matchedProduct.name} is ${matchedProduct.price} ETB.`;
      return {
        text: `AI assistant · የሱቅ ረዳት\n${reply}`,
        isConfident: true,
        isEscalated: false,
        source: 'DATABASE_FACT',
      };
    }

    if (isStockQuery && matchedProduct) {
      if (matchedProduct.isOutOfStock || matchedProduct.stock <= 0) {
        const reply = isAmharic
          ? `ይቅርታ፣ ${matchedProduct.name} በአሁኑ ወቅት አልቋል።`
          : `Sorry, ${matchedProduct.name} is currently out of stock.`;
        return {
          text: `AI assistant · የሱቅ ረዳት\n${reply}`,
          isConfident: true,
          isEscalated: false,
          source: 'DATABASE_FACT',
        };
      } else {
        const reply = isAmharic
          ? `አዎ፣ ${matchedProduct.name} በክምችት አለ (ቀሪ: ${matchedProduct.stock})${matchedProduct.options ? `። አማራጮች: ${matchedProduct.options}` : ''}።`
          : `Yes, ${matchedProduct.name} is in stock (${matchedProduct.stock} available)${matchedProduct.options ? `. Options: ${matchedProduct.options}` : ''}.`;
        return {
          text: `AI assistant · የሱቅ ረዳት\n${reply}`,
          isConfident: true,
          isEscalated: false,
          source: 'DATABASE_FACT',
        };
      }
    }

    if (isHoursQuery && context.openingHours) {
      const reply = isAmharic
        ? `የሱቃችን የስራ ሰዓት፡ ${context.openingHours} ነው።`
        : `Our shop opening hours are: ${context.openingHours}.`;
      return {
        text: `AI assistant · የሱቅ ረዳት\n${reply}`,
        isConfident: true,
        isEscalated: false,
        source: 'DATABASE_FACT',
      };
    }

    if (isLocationQuery && context.area) {
      const reply = isAmharic
        ? `ሱቃችን የሚገኘው ${context.area} ሲሆን ወደ ${context.deliveryAreas || 'የተለያዩ አካባቢዎች'} እናደርሳለን።`
        : `Our shop is located at ${context.area}. We deliver to: ${context.deliveryAreas || 'various areas'}.`;
      return {
        text: `AI assistant · የሱቅ ረዳት\n${reply}`,
        isConfident: true,
        isEscalated: false,
        source: 'DATABASE_FACT',
      };
    }

    // 3. If external Gemini / OpenAI key configured and provider is active, query external model
    if (process.env.NODE_ENV !== 'test' && process.env.AI_PROVIDER === 'gemini' && process.env.GEMINI_API_KEY) {
      try {
        const externalResult = await this.queryGeminiModel(question, context, customerLanguage);
        if (externalResult) {
          return externalResult;
        }
      } catch (err) {
        this.logger.warn(`External AI failed: ${err.message}. Falling back to escalation.`);
      }
    }

    // 4. Safe Grounded Fallback & Escalation to Owner (FR-41 / Acceptance Test 3)
    const fallbackMessage = isAmharic
      ? 'ስለዚህ ጉዳይ እርግጠኛ አይደለሁም። ሱቁን ጠይቄ እዚህ እመልስልዎታለሁ።'
      : 'I am not sure about that. I will ask the shop and reply here.';

    return {
      text: `AI assistant · የሱቅ ረዳት\n${fallbackMessage}`,
      isConfident: false,
      isEscalated: true,
      source: 'FALLBACK_ESCALATION',
    };
  }

  private async queryGeminiModel(
    question: string,
    context: ShopAiContext,
    customerLanguage: string,
  ): Promise<AiAnswerResult | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.AI_MODEL_NAME || 'gemini-3.8-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `You are an AI order assistant for the Ethiopian shop "${context.shopName}".
Language to respond in: ${customerLanguage === 'am' ? 'Amharic (አማርኛ)' : 'English'}.
STRICT RULES:
1. Only answer based on the following verified shop data. Never invent prices, availability, delivery, or policies.
2. If the user asks something not directly stated in the context, output exactly: "UNCERTAIN_ESCALATE".
3. Never confirm orders, reduce stock, or ask for passwords/bank cards.
4. Keep the answer concise.

Shop Details:
- Area: ${context.area || 'Not specified'}
- Opening Hours: ${context.openingHours || 'Not specified'}
- Delivery Areas: ${context.deliveryAreas || 'Not specified'}
- Products:
${context.products.map((p) => `* ${p.name}: ${p.price} ETB (Stock: ${p.stock}, InStock: ${!p.isOutOfStock})`).join('\n')}

Customer Question: "${question}"`;

    const res = await axios.post(
      url,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      { timeout: 15000 },
    );

    const generatedText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!generatedText || generatedText.includes('UNCERTAIN_ESCALATE')) {
      return null;
    }

    return {
      text: `AI assistant · የሱቅ ረዳት\n${generatedText}`,
      isConfident: true,
      isEscalated: false,
      source: 'AI_MODEL',
    };
  }
}
