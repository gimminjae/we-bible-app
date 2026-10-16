import { useLocalSearchParams, useRouter } from "expo-router";
import { PostForm } from "@/components/community/post-form";
import { CommunityNotice, CommunityShell } from "@/components/community/ui";
import { useCommunityPost, useCommunitySession } from "@/hooks/use-community";
import { communityError } from "@/domain/community/validation";
export default function EditCommunityPost() {
  const { id, postId } = useLocalSearchParams<{ id: string; postId: string }>();
  const router = useRouter();
  const query = useCommunityPost(id, postId);
  const session = useCommunitySession();
  if (!query.data || !query.data.can_edit) {
    return (
      <CommunityShell
        title="글 수정"
        onBack={() => router.back()}
      >
        <CommunityNotice
          loading={query.isPending && !query.unavailable}
          message={query.error
            ? communityError(query.error)
            : query.data
            ? "작성자만 수정할 수 있습니다."
            : "글을 불러오는 중입니다."}
          onRetry={() => void query.refetch()}
        />
      </CommunityShell>
    );
  }
  // Keep the editor's original version while it is open; concurrent changes must produce a conflict.
  return (
    <PostForm
      key={`${id}:${postId}:${session.actor}`}
      churchId={id}
      post={query.data}
      onBack={() => router.back()}
      onSaved={(post) =>
        router.replace(`/churches/${id}/community/${post.id}` as never)}
    />
  );
}
