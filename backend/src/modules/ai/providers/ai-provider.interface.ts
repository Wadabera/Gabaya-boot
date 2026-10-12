export interface ShopAiContext {
  shopId: string;
  shopName: string;
  area?: string;
  openingHours?: string;
  deliveryAreas?: string;
  bankDetails?: string;
  language: string;
  products: {
    name: string;
    price: number;
    options?: string;
    stock: number;
    isOutOfStock: boolean;
  }[];
  rules: {
    questionPattern: string;
    approvedAnswer: string;
  }[];
}

export interface AiAnswerResult {
  text: string;
  isConfident: boolean;
  isEscalated: boolean;
  source: 'DATABASE_FACT' | 'SHOP_RULE' | 'AI_MODEL' | 'FALLBACK_ESCALATION';
}

export interface AiProvider {
  answerQuestion(
    question: string,
    context: ShopAiContext,
    customerLanguage: string,
  ): Promise<AiAnswerResult>;
}
