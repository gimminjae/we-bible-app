import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { File as LocalFile } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { randomUUID } from "expo-crypto";
import {
  attachmentRequest,
  type PickedFile,
  uploadAttachment,
} from "@/lib/church-community";
import type { Attachment } from "@/domain/community/types";

export type UploadJob = {
  id: string;
  file: PickedFile;
  kind: Attachment["kind"];
  status: "queued" | "uploading" | "ready" | "failed";
  progress: number;
  error?: string;
  attachment?: Attachment;
};
export function useCommunityUploads(church: string) {
  const [draftId] = useState(randomUUID);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const jobsRef = useRef<UploadJob[]>([]);
  const running = useRef(new Map<string, AbortController>());
  const mounted = useRef(true);
  const update = useCallback((fn: (jobs: UploadJob[]) => UploadJob[]) => {
    jobsRef.current = fn(jobsRef.current);
    if (mounted.current) setJobs(jobsRef.current);
  }, []);
  const pump = useCallback(function startNext() {
    if (!mounted.current) return;
    while (running.current.size < 2) {
      const job = jobsRef.current.find((item) => item.status === "queued");
      if (!job) break;
      const controller = new AbortController();
      running.current.set(job.id, controller);
      update((items) =>
        items.map((item) =>
          item.id === job.id
            ? { ...item, status: "uploading", error: undefined }
            : item
        )
      );
      void uploadAttachment(
        church,
        draftId,
        job.id,
        job.file,
        job.kind,
        (progress) =>
          update((items) =>
            items.map((item) =>
              item.id === job.id ? { ...item, progress } : item
            )
          ),
        controller.signal,
      )
        .then((attachment) =>
          update((items) =>
            items.map((item) =>
              item.id === job.id
                ? { ...item, status: "ready", progress: 100, attachment }
                : item
            )
          )
        )
        .catch((error) =>
          update((items) =>
            items.map((item) =>
              item.id === job.id
                ? {
                  ...item,
                  status: "failed",
                  error: error instanceof Error ? error.message : "업로드 실패",
                }
                : item
            )
          )
        )
        .finally(() => {
          running.current.delete(job.id);
          startNext();
        });
    }
  }, [church, draftId, update]);
  useEffect(() => {
    mounted.current = true;
    const active = running.current;
    return () => {
      mounted.current = false;
      for (const controller of active.values()) controller.abort();
      // Attached files are rejected by cancel; unsaved reservations are reclaimed immediately or by TTL cleanup.
      for (const job of jobsRef.current) {
        void attachmentRequest(church, "cancel", { id: job.id }).catch(
          () => {},
        );
      }
    };
  }, [church]);
  async function pick(kind: Attachment["kind"], id = randomUUID()) {
    if (jobsRef.current.length >= 10) {
      throw new Error("첨부 파일은 최대 10개까지 추가할 수 있습니다.");
    }
    let file: PickedFile;
    if (kind === "image") {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 1,
        preferredAssetRepresentationMode:
          ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible,
      });
      if (result.canceled) return false;
      const asset = result.assets[0];
      file = {
        uri: asset.uri,
        name: asset.fileName ?? `image-${id}.jpg`,
        mime: asset.mimeType ?? "image/jpeg",
        size: asset.fileSize ?? 0,
        file: asset.file,
      };
      if (/image\/hei[cf]/i.test(file.mime) || /\.hei[cf]$/i.test(file.name)) {
        try {
          const context = ImageManipulator.manipulate(file.uri);
          const image = await context.renderAsync();
          const converted = await image.saveAsync({
            format: SaveFormat.JPEG,
            compress: 0.9,
          });
          file = {
            uri: converted.uri,
            name: `${file.name.replace(/\.[^.]+$/, "")}.jpg`,
            mime: "image/jpeg",
            size: 0,
          };
          if (Platform.OS === "web") {
            const blob = await (await fetch(converted.uri)).blob();
            file.file = new File([blob], file.name, { type: file.mime });
            file.size = blob.size;
          }
          image.release();
          context.release();
        } catch {
          throw new Error(
            "이 사진 형식을 변환할 수 없습니다. JPEG/PNG 사진을 선택하거나 원본을 파일로 첨부해 주세요.",
          );
        }
      } else {
        const extension = ({
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/gif": "gif",
          "image/webp": "webp",
        } as Record<string, string>)[file.mime];
        if (extension) {
          file.name = `${file.name.replace(/\.[^.]+$/, "")}.${extension}`;
        }
      }
    } else {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return false;
      const asset = result.assets[0];
      file = {
        uri: asset.uri,
        name: asset.name,
        mime: asset.mimeType ?? "application/octet-stream",
        size: asset.size ?? 0,
        file: asset.file,
      };
    }
    if (Platform.OS === "web" && !file.file) {
      const blob = await (await fetch(file.uri)).blob();
      file.file = new File([blob], file.name, { type: file.mime });
      file.size = blob.size;
    }
    if (!file.size && Platform.OS !== "web") {
      file.size = new LocalFile(file.uri).size;
    }
    if (
      file.size <= 0 || file.size > (kind === "image" ? 10 : 20) * 1024 * 1024
    ) {
      throw new Error(
        `파일 크기는 ${kind === "image" ? 10 : 20}MB 이하여야 합니다.`,
      );
    }
    if (
      jobsRef.current.reduce((sum, item) => sum + item.file.size, 0) +
          file.size > 50 * 1024 * 1024
    ) throw new Error("첨부 파일 합계는 50MB 이하여야 합니다.");
    if (!mounted.current) return false;
    update(
      (items) => [...items, { id, file, kind, status: "queued", progress: 0 }],
    );
    pump();
    return true;
  }
  function remove(id: string) {
    running.current.get(id)?.abort();
    update((items) => items.filter((item) => item.id !== id));
    void attachmentRequest(church, "cancel", { id }).catch(() => {});
  }
  function retry(id: string) {
    update((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, status: "queued", progress: 0, error: undefined }
          : item
      )
    );
    pump();
  }
  return { jobs, pick, remove, retry };
}
