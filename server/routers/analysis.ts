import { z } from 'zod';
import { protectedProcedure, router } from '../_core/trpc';
import { createAnalysis, getAnalysisByDataset, getDatasetById } from '../db';
import { invokeLLM } from '../_core/llm';
import { notifyOwner } from '../_core/notification';

export const analysisRouter = router({
  query: protectedProcedure
    .input(z.object({
      datasetId: z.number(),
      query: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const dataset = await getDatasetById(input.datasetId);
      if (!dataset) throw new Error('Dataset not found');
      if (dataset.ownerId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      const analysisResult = await createAnalysis({
        datasetId: input.datasetId,
        userId: ctx.user.id,
        query: input.query,
        status: 'pending',
      });

      try {
        const columns = (dataset.columnNames as string[]) || [];
        const columnInfo = columns.join(', ');
        const prompt = `Data analysis for columns: ${columnInfo}. Dataset has ${dataset.rowCount} rows. User query: ${input.query}`;
        const response = await invokeLLM({
          messages: [
            {
              role: 'system',
              content: 'You are a professional data analyst.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
        });

        const result = response.choices[0]?.message?.content || 'No analysis available';

        await notifyOwner({
          title: 'Analysis Completed',
          content: `Analysis for dataset \"${dataset.name}\" completed.`,
        });

        return {
          success: true,
          result,
          query: input.query,
        };
      } catch (error) {
        console.error('Analysis error:', error);
        throw error;
      }
    }),

  history: protectedProcedure
    .input(z.object({ datasetId: z.number() }))
    .query(async ({ ctx, input }) => {
      const dataset = await getDatasetById(input.datasetId);
      if (!dataset) throw new Error('Dataset not found');
      if (dataset.ownerId !== ctx.user.id && ctx.user.role !== 'admin') {
        throw new Error('Unauthorized');
      }

      return await getAnalysisByDataset(input.datasetId);
    }),
});
