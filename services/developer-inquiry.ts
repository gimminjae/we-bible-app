import { createSupabaseClient } from '@/lib/supabase-client';

export type DeveloperInquiryStatus = 'inquiry' | 'answered';

type CreateDeveloperInquiryInput = {
  authorUserId: string | null;
  authorName: string;
  title: string;
  content: string;
};

const INITIAL_DEVELOPER_INQUIRY_STATUS: DeveloperInquiryStatus = 'inquiry';

export async function createDeveloperInquiry({
  authorUserId,
  authorName,
  title,
  content,
}: CreateDeveloperInquiryInput) {
  const trimmedAuthorName = authorName.trim();
  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();

  if (!trimmedAuthorName) {
    throw new Error('AUTHOR_NAME_REQUIRED');
  }

  if (!trimmedTitle) {
    throw new Error('TITLE_REQUIRED');
  }

  if (!trimmedContent) {
    throw new Error('CONTENT_REQUIRED');
  }

  const supabase = createSupabaseClient();
  const { error } = await supabase.from('developer_inquiries').insert({
    author_user_id: authorUserId,
    author_name: trimmedAuthorName,
    title: trimmedTitle,
    content: trimmedContent,
    answer_content: '',
    status: INITIAL_DEVELOPER_INQUIRY_STATUS,
  });

  if (error) {
    throw error;
  }
}
