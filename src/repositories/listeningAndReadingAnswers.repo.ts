import {
  TListeningAndReadingAnswerDto,
  TWritingAnswerDto,
} from "@/models/answer";
import {
  supabaseCreateOrUpdateAnswer,
  supabaseDeleteAnswer,
  supabaseFindAllTaskIdsByTaskAndUser,
  supabaseFindAnswerById,
  supabaseFindAnswerByPracticeAndUser,
  supabaseFindAnswersByExamIdAndUser,
  supabaseGetAllListeningAndReadingAnswers,
  supabaseGetPartitionedMockExamProgressAnswers,
  supabaseListListeningReadingAnswers,
  supabaseUpdateAnswer,
} from "@/repositories/supabaseAnswers.store";
import type { AppDocumentsClient } from "@/lib/pg/types";

export class ListeningAndReadingAnswerRepository {
  // documentsClient kept in constructor signature for call-site compatibility
  constructor(_documentsClient: AppDocumentsClient) {}

  async getPartitionedMockExamProgressAnswers(
    userId: string,
    examIds: string[]
  ): Promise<{
    listeningAndReading: TListeningAndReadingAnswerDto[];
    writingAndSpeaking: TWritingAnswerDto[];
    fetchedCount: number;
  }> {
    if (examIds.length === 0) {
      return { listeningAndReading: [], writingAndSpeaking: [], fetchedCount: 0 };
    }
    const result = await supabaseGetPartitionedMockExamProgressAnswers(
      userId,
      examIds,
      async () => [] // no legacy fallback needed
    );
    return {
      listeningAndReading: result.listeningAndReading,
      writingAndSpeaking: result.writingAndSpeaking,
      fetchedCount: result.listeningAndReading.length + result.writingAndSpeaking.length,
    };
  }

  async findAnswerByPracticeAndUser(
    practiceId: string,
    userId: string
  ): Promise<TListeningAndReadingAnswerDto | null> {
    return supabaseFindAnswerByPracticeAndUser(practiceId, userId);
  }

  async findAnswer(id: string): Promise<TListeningAndReadingAnswerDto | null> {
    return supabaseFindAnswerById(id);
  }

  async findAllTaskIdsByTaskAndUser(
    taskId: string,
    userId: string
  ): Promise<string[]> {
    return supabaseFindAllTaskIdsByTaskAndUser(taskId, userId);
  }

  async createOrUpdateAnswer(
    dto: Omit<TListeningAndReadingAnswerDto, "id">
  ): Promise<TListeningAndReadingAnswerDto> {
    return supabaseCreateOrUpdateAnswer(dto);
  }

  async getAllListeningAndReadingAnswers(
    filter: Partial<TListeningAndReadingAnswerDto>,
    page: number = 0,
    limit: number = 100
  ): Promise<{
    items: TListeningAndReadingAnswerDto[];
    hasNextPage: boolean;
    page: number;
    totalPages: number;
    totalItems: number;
  }> {
    const sanitizedFilter = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => value !== undefined)
    ) as Partial<TListeningAndReadingAnswerDto>;

    const keys = Object.keys(sanitizedFilter);
    const examId = typeof sanitizedFilter.examId === "string" ? sanitizedFilter.examId : undefined;
    const userId = typeof sanitizedFilter.userId === "string" ? sanitizedFilter.userId : undefined;

    // Fast path: examId + userId only → use the dedicated function
    if (examId && userId && keys.length === 2) {
      return supabaseGetAllListeningAndReadingAnswers(userId, examId, page, limit);
    }

    return supabaseListListeningReadingAnswers(sanitizedFilter, page, limit);
  }

  async findAnswersByExamIdAndUser(examId: string, userId: string) {
    return supabaseFindAnswersByExamIdAndUser(examId, userId);
  }

  async updateAnswer(
    id: string,
    dto: Omit<Partial<TListeningAndReadingAnswerDto>, "id">
  ): Promise<TListeningAndReadingAnswerDto | null> {
    return supabaseUpdateAnswer(id, dto);
  }

  async deleteAnswer(id: string): Promise<void> {
    await supabaseDeleteAnswer(id);
  }
}
