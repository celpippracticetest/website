import {
  TWritingAnswerDto,
  writingAnswerDtoFromLeanDocument,
} from "@/models/answer";
import type { AppDocumentsClient } from "@/lib/pg/types";
import {
  normalizeExamIdForStorage,
  supabaseCreateOrUpdateWritingAnswer,
  supabaseDeleteWritingAnswer,
  supabaseFindCompletedPracticeIdsByTaskAndUser,
  supabaseFindPracticeIdsWithWritingAnswers,
  supabaseFindWritingAnswerById,
  supabaseGetAllWritingAnswers,
  supabaseUpdateWritingAnswer,
} from "@/repositories/supabaseAnswers.store";

export { writingAnswerDtoFromLeanDocument };

export class WritingAndSpeakingAnswerRepository {
  // documentsClient kept in constructor signature for call-site compatibility
  constructor(_documentsClient: AppDocumentsClient) {}

  async findAnswer(id: string): Promise<TWritingAnswerDto | null> {
    return supabaseFindWritingAnswerById(id);
  }

  async findCompletedPracticeIdsByTaskAndUser(
    taskId: string,
    userId: string,
    type: "SPEAKING" | "WRITING"
  ): Promise<string[]> {
    return supabaseFindCompletedPracticeIdsByTaskAndUser(taskId, userId, type);
  }

  async findAnswersByPracticeIdsAndUser(
    practiceIds: string[],
    userId: string
  ): Promise<string[]> {
    return supabaseFindPracticeIdsWithWritingAnswers(practiceIds, userId);
  }

  async createAnswer(dto: Omit<TWritingAnswerDto, "id">): Promise<TWritingAnswerDto> {
    return supabaseCreateOrUpdateWritingAnswer(dto);
  }

  async createOrUpdateAnswer(dto: Omit<TWritingAnswerDto, "id">): Promise<TWritingAnswerDto> {
    return supabaseCreateOrUpdateWritingAnswer(dto);
  }

  async getAllWritingAnswers(
    filter: Partial<TWritingAnswerDto>,
    page: number = 0,
    limit: number = 10
  ): Promise<{
    items: TWritingAnswerDto[];
    hasNextPage: boolean;
    page: number;
    totalPages: number;
    totalItems: number;
  }> {
    const sanitizedFilter = Object.fromEntries(
      Object.entries(filter).filter(([, value]) => value !== undefined)
    ) as Partial<TWritingAnswerDto>;

    // Normalize examId to the format Supabase stores it in
    if (sanitizedFilter.examId) {
      sanitizedFilter.examId = normalizeExamIdForStorage(sanitizedFilter.examId) ?? sanitizedFilter.examId;
    }

    return supabaseGetAllWritingAnswers(sanitizedFilter, page, limit);
  }

  async updateAnswer(
    id: string,
    dto: Omit<Partial<TWritingAnswerDto>, "id">
  ): Promise<TWritingAnswerDto | null> {
    return supabaseUpdateWritingAnswer(id, dto);
  }

  async deleteAnswer(id: string): Promise<void> {
    await supabaseDeleteWritingAnswer(id);
  }
}
