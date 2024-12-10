import { jsonSchema } from "ai";

export class TranslatorService {
	// Translate the schema from any to JSON string
	async translate(baseSchema: any): Promise<any> {
		try {
			const mySchema = jsonSchema<any>(baseSchema?.response);
			return mySchema;
		} catch (error: any) {
			throw new Error("Failed to translate schema to JSON: " + error.message);
		}
	}
}
