/** Forward migration RPC contract, NOT represented as hosted-generated types.
 * Regenerate the canonical Database only after integration applies migration 007.
 */
import type { Database, Json } from "./database.types";
export type InferenceDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Functions"> & {
    Functions: Database["public"]["Functions"] & {
      create_inference_media: {
        Args: {
          p_sha256: string;
          p_width: number;
          p_height: number;
          p_bytes: number;
          p_notice: string;
        };
        Returns: Json;
      };
      submit_inference_job: {
        Args: {
          p_asset: string;
          p_operation: string;
          p_key: string;
          p_concept?: string | null;
        };
        Returns: string;
      };
      inference_job_status: { Args: { p_id: string }; Returns: Json };
      cancel_inference_job: { Args: { p_id: string }; Returns: boolean };
      revoke_inference_media: { Args: { p_id: string }; Returns: boolean };
    };
  };
};
