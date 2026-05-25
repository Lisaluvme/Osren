import { GoogleGenAI, Type } from "@google/genai";
import { CashFlowData, InventoryItem } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const modelName = "gemini-2.5-flash";

const getAI = () => {
  if (!apiKey) {
    throw new Error('API key is missing');
  }
  return new GoogleGenAI({ apiKey });
};

export const getStockPurchaseRecommendation = async (cashFlow: CashFlowData[], inventory: InventoryItem[]): Promise<string> => {
  if (!apiKey) {
    return "AI feature disabled - Configure VITE_GEMINI_API_KEY in .env to enable purchase recommendations.";
  }

  try {
    const ai = getAI();
    const lowStockItems = inventory.filter(i => i.quantity <= i.minLevel);

    if (lowStockItems.length === 0) {
      return "Current inventory levels are healthy. Consider routine restocking based on your standard procurement cycle.";
    }

    const prompt = `
      Act as an AI Operations Manager for Osren.
      Based on the following financial cash flow (last 5 months) and current inventory levels,
      provide a strategic recommendation on whether to purchase raw materials now or wait.

      CRITICAL INSTRUCTION: Analyze the 'lastMovement' date of the inventory items.
      Prioritize recommending reorders for items that are currently low in stock (quantity <= minLevel) AND haven't been restocked or moved recently (older 'lastMovement' dates), as these may represent neglected critical stock.

      Cash Flow Data: ${JSON.stringify(cashFlow)}
      Low/Critical Inventory Data: ${JSON.stringify(lowStockItems)}

      Keep the response concise (max 3 sentences) and actionable.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    return response.text || "Unable to generate recommendation.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI Service temporarily unavailable for Purchase Recommendations.";
  }
};

export const getDemandPrediction = async (inventory: InventoryItem[]): Promise<string> => {
  if (!apiKey) {
    return "AI feature disabled - Configure VITE_GEMINI_API_KEY in .env to enable demand predictions.";
  }

  try {
     const ai = getAI();
     const prompt = `
      Analyze this inventory list. Identify items that are critically low relative to their minimum levels.
      Predict which item is most likely to run out in the next 30 days based on general automotive care seasonal trends (assuming average usage).

      Inventory: ${JSON.stringify(inventory)}

      Output format: A short paragraph explaining the risk.
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
    });

    return response.text || "No prediction available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI Service temporarily unavailable for Demand Prediction.";
  }
};

export interface SalesRecommendation {
  productName: string;
  estimatedMargin: string;
  reasoning: string;
}

export const getSalesForecast = async (clientName: string, inventory: InventoryItem[]): Promise<SalesRecommendation[]> => {
  try {
    const prompt = `
      Act as a sales trend forecaster for an automotive care distributor.
      The client is "${clientName}". 
      Based on typical industry patterns and the provided product catalog, suggest 3 specific products to upsell.
      Prioritize products that complement typical detailing services.
      
      Product Catalog: ${JSON.stringify(inventory.map(i => i.name))}

      Return the response as a valid JSON object with a "recommendations" field, which is an array.
      Each item in the array must have:
      - "productName": string (matches catalog or is a relevant generic term)
      - "estimatedMargin": string (e.g. "45%", "30%")
      - "reasoning": string (concise sales pitch)
    `;

    const response = await ai.models.generateContent({
      model: modelName,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
            type: Type.OBJECT,
            properties: {
                recommendations: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            productName: { type: Type.STRING },
                            estimatedMargin: { type: Type.STRING },
                            reasoning: { type: Type.STRING }
                        }
                    }
                }
            }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return result.recommendations || [];
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
};

export const optimizeRouteSequence = async (deliveries: string[]): Promise<number[]> => {
    // In a real app, this would use the Maps Grounding or extensive logic.
    // For this demo, we simulate AI re-ordering based on text descriptions of locations.
    try {
        const prompt = `
          I have a list of delivery stops. Please reorder them to be the most efficient route starting from a central warehouse.
          Return ONLY a JSON array of indices representing the new order.
          
          Stops: ${JSON.stringify(deliveries)}
        `;

        const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });
        
        // Expecting [0, 2, 1] etc.
        const indices = JSON.parse(response.text || "[]");
        if (Array.isArray(indices) && indices.length === deliveries.length) {
            return indices;
        }
        return deliveries.map((_, i) => i);
    } catch (error) {
        return deliveries.map((_, i) => i);
    }
}