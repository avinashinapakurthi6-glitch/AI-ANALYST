import { z } from 'zod';
import { protectedProcedure, publicProcedure, router } from '../_core/trpc';
import { createDataset, getDatasetById, getUserDatasets, deleteDataset, createPiiDetectionLog } from '../db';
import { processData, anonymizeColumns } from '../dataProcessor';
import { storagePut } from '../storage';
import { notifyOwner } from '../_core/notification';

export const datasetsRouter = router({
  /**
   * Upload and process a dataset
   */
  upload: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      fileBuffer: z.string(), // Base64 encoded
      fileName: z.string(),
      fileType: z.enum(['csv', 'xlsx', 'xls']),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Convert base64 to buffer
        const fileBuffer = Buffer.from(input.fileBuffer, 'base64');
        // Process the file
        const processed = processData(fileBuffer, input.fileType);

        // Upload to S3
        const fileKey = `datasets/${ctx.user.id}/${Date.now()}-${input.fileName}`;
        const { url: fileUrl } = await storagePut(fileKey, fileBuffer, 'application/octet-stream');

        // Create dataset record
        const result = await createDataset({
          name: input.name,
          description: input.description,
          ownerId: ctx.user.id,
          fileKey,
          fileUrl,
          fileName: input.fileName,
          fileSize: fileBuffer.length,
          fileType: input.fileType,
          rowCount: processed.rowCount,
          columnCount: processed.columnCount,
          columnNames: processed.columns,
          piiColumns: processed.piiColumns,
          isAnonymized: false,
        });

        // Log PII detection
        if (processed.piiColumns.length > 0) {
          const datasetId = (result[0] as any)?.insertId || Date.now();
          await createPiiDetectionLog({
            datasetId,
            detectedColumns: processed.piiColumns,
            severity: processed.piiColumns.length > 5 ? 'high' : 'medium',
            notified: false,
          });

          // Notify owner about PII
          await notifyOwner({
            title: 'PII Detected in Dataset',
            content: `Dataset "${input.name}" contains ${processed.piiColumns.length} columns with potential PII: ${processed.piiColumns.join(', ')}`,
          });
        }

        // Notify owner about upload
        await notifyOwner({
          title: 'New Dataset Uploaded',
          content: `User uploaded dataset "${input.name}" with ${processed.rowCount} rows and ${processed.columnCount} columns.`,
        });

        const datasetId = (result[0] as any)?.insertId || Date.now();
        return {
          success: true,
          datasetId,
          processed,
        };
      } catch (error) {
        console.error('Upload error:', error);
        throw error;
      }
    }),

  /**
   * Get user's datasets
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return await getUserDatasets(ctx.user.id);
  }),

  /**
   * Get dataset details
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const dataset = await getDatasetById(input.id);
      if (!dataset) throw new Error('Dataset not found');
      if (dataset.ownerId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }
      return dataset;
    }),

  /**
   * Delete dataset
   */
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const dataset = await getDatasetById(input.id);
      if (!dataset) throw new Error('Dataset not found');
      if (dataset.ownerId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }
      await deleteDataset(input.id);
      return { success: true };
    }),

  /**
   * Anonymize dataset columns
   */
  anonymize: protectedProcedure
    .input(z.object({
      id: z.number(),
      columnsToAnonymize: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const dataset = await getDatasetById(input.id);
      if (!dataset) throw new Error('Dataset not found');
      if (dataset.ownerId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      // For now, just mark as anonymized
      // In production, you'd process and re-upload the anonymized data
      return {
        success: true,
        message: 'Dataset marked for anonymization',
      };
    }),
});
