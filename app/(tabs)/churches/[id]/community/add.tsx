import { useLocalSearchParams, useRouter } from "expo-router";
import { PostForm } from "@/components/community/post-form";
import { useCommunitySession } from "@/hooks/use-community";
export default function AddCommunityPost() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useCommunitySession();
  return (
    <PostForm
      key={`${id}:${session.actor}`}
      churchId={id}
      onBack={() => router.back()}
      onSaved={(post) =>
        router.replace(`/churches/${id}/community/${post.id}` as never)}
    />
  );
}
