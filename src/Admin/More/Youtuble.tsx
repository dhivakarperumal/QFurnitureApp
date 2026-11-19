import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  pick,
  types as documentTypes,
  isErrorWithCode,
  errorCodes,
  type DocumentPickerResponse,
} from '@react-native-documents/picker';
import {
  BadgeCheck,
  CircleAlert,
  FileText,
  ImagePlus,
  Link2,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react-native';
import {
  launchImageLibrary,
  type Asset,
  type ImagePickerResponse,
} from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api, {
  API_BASE_URL,
  invalidateApiResponseCache,
} from '../../api';
import TopHeader from '../Navigation/TopHeader';

type VideoSource = 'link' | 'upload';
type VideoStatus = 'Active' | 'Inactive';
type ApplicationLink = { title: string; url: string };
type SupportingDocument = { name: string; url: string };
type VideoRecord = {
  id: number | string;
  video_code: string;
  title: string;
  video_source?: VideoSource;
  video_url: string;
  video_id?: string;
  description?: string | null;
  thumbnail_image?: string | null;
  thumbnail_url?: string | null;
  application_links?: ApplicationLink[] | string;
  documents?: SupportingDocument[] | string;
  follow_up_notes?: string | null;
  status?: VideoStatus;
  created_at?: string;
};
type VideoForm = {
  video_code: string;
  title: string;
  video_source: VideoSource;
  video_url: string;
  description: string;
  thumbnail_image: string;
  thumbnail_url: string;
  application_links: ApplicationLink[];
  documents: SupportingDocument[];
  follow_up_notes: string;
  status: VideoStatus;
};
type LocalFile = { uri: string; name: string; type: string };
type Props = { onBackPress: () => void };
type ValidationErrors = Partial<
  Record<'title' | 'video_url' | 'thumbnail_image' | 'application_links', string>
>;

const createEmptyVideo = (): VideoForm => ({
  video_code: '',
  title: '',
  video_source: 'link',
  video_url: '',
  description: '',
  thumbnail_image: '',
  thumbnail_url: '',
  application_links: [{ title: '', url: '' }],
  documents: [],
  follow_up_notes: '',
  status: 'Active',
});

const documentExtensions = new Set([
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'txt',
  'rtf',
]);

const styles = StyleSheet.create({
  addVideoFab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F97316',
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
});

const parseJsonArray = <T,>(value: unknown): T[] => {
  if (Array.isArray(value)) return value as T[];
  if (typeof value !== 'string' || !value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
};

const resolveMediaUrl = (value?: string | null) => {
  if (!value) return '';
  if (/^(https?:|data:|file:|content:)/i.test(value)) return value;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  const path = value.replace(/\\/g, '/');
  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
};

const getYoutubeVideoId = (value: string) => {
  try {
    const url = new URL(value.trim());
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    const hostname = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);
    const videoId =
      hostname === 'youtu.be' || hostname === 'www.youtu.be'
        ? segments[0]
        : hostname === 'youtube.com' || hostname.endsWith('.youtube.com')
          ? url.pathname === '/watch'
            ? url.searchParams.get('v')
            : ['embed', 'shorts', 'live'].includes(segments[0])
              ? segments[1]
              : ''
          : '';
    return /^[A-Za-z0-9_-]{11}$/.test(videoId || '') ? videoId : '';
  } catch {
    return '';
  }
};

const getVideoImage = (video: VideoRecord) =>
  resolveMediaUrl(
    video.thumbnail_image ||
      video.thumbnail_url ||
      (video.video_id
        ? `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`
        : ''),
  );

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error !== 'object' || error === null) return fallback;
  if (
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'data' in error.response &&
    typeof error.response.data === 'object' &&
    error.response.data !== null &&
    'message' in error.response.data &&
    typeof error.response.data.message === 'string'
  ) {
    return error.response.data.message;
  }
  return 'message' in error && typeof error.message === 'string'
    ? error.message
    : fallback;
};

const isAllowedWebUrl = (value: string) => {
  try {
    return ['http:', 'https:'].includes(new URL(value.trim()).protocol);
  } catch {
    return false;
  }
};

const imageFileName = (asset: Asset, extension: string) =>
  asset.fileName || `youtube-thumbnail-${Date.now()}.${extension}`;

export default function Youtuble({ onBackPress }: Props) {
  const insets = useSafeAreaInsets();
  const addVideoFabPosition = useMemo(
    () => ({ bottom: Math.max(insets.bottom, 12) + 16 }),
    [insets.bottom],
  );
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [form, setForm] = useState<VideoForm>(createEmptyVideo);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [loadingVideoCode, setLoadingVideoCode] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingVideoId, setEditingVideoId] = useState<number | string | null>(
    null,
  );
  const [viewVideo, setViewVideo] = useState<VideoRecord | null>(null);
  const [selectedVideoFile, setSelectedVideoFile] = useState<LocalFile | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | VideoStatus>('All');
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadVideos = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
      invalidateApiResponseCache();
    } else {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const { data } = await api.get<{ videos?: VideoRecord[] }>(
        '/admin/content/youtube-videos',
      );
      if (!Array.isArray(data.videos)) {
        throw new Error('The server returned an invalid video list.');
      }
      setVideos(
        data.videos.map(video => ({
          ...video,
          application_links: parseJsonArray<ApplicationLink>(
            video.application_links,
          ),
          documents: parseJsonArray<SupportingDocument>(video.documents),
        })),
      );
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Youtuble] Could not load videos:', error);
      setLoadError(getErrorMessage(error, 'Could not load YouTube videos.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const activeCount = videos.filter(video => video.status === 'Active').length;
  const inactiveCount = videos.length - activeCount;
  const filteredVideos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return videos.filter(video => {
      const matchesSearch =
        !query ||
        [
          video.title,
          video.video_code,
          video.video_url,
          video.description,
        ].some(value => String(value || '').toLowerCase().includes(query));
      return (
        matchesSearch &&
        (statusFilter === 'All' || video.status === statusFilter)
      );
    });
  }, [videos, searchQuery, statusFilter]);

  const clearValidationError = (
    field: keyof ValidationErrors,
  ) => {
    setValidationErrors(current => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const setFormField = <K extends keyof VideoForm>(
    field: K,
    value: VideoForm[K],
  ) => setForm(current => ({ ...current, [field]: value }));

  const openAddVideoModal = async () => {
    setLoadingVideoCode(true);
    try {
      const { data } = await api.get<{ video_code?: string }>(
        '/admin/content/youtube-videos/next-id',
      );
      if (typeof data.video_code !== 'string' || !data.video_code) {
        throw new Error('The server did not return a Video ID.');
      }
      setForm({ ...createEmptyVideo(), video_code: data.video_code });
      setValidationErrors({});
      setSelectedVideoFile(null);
      setEditingVideoId(null);
      setFormOpen(true);
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Youtuble] Could not generate video ID:', error);
      Alert.alert(
        'Could not start video',
        getErrorMessage(error, 'Could not generate a Video ID.'),
      );
    } finally {
      setLoadingVideoCode(false);
    }
  };

  const openEditVideoModal = (video: VideoRecord) => {
    const links = parseJsonArray<ApplicationLink>(video.application_links);
    setForm({
      ...createEmptyVideo(),
      ...video,
      video_code: video.video_code || '',
      title: video.title || '',
      video_source: video.video_source || 'link',
      video_url: video.video_url || '',
      description: video.description || '',
      application_links: links.length ? links : [{ title: '', url: '' }],
      documents: parseJsonArray<SupportingDocument>(video.documents),
      follow_up_notes: video.follow_up_notes || '',
      thumbnail_image: video.thumbnail_image || '',
      thumbnail_url: video.thumbnail_url || '',
    });
    setValidationErrors({});
    setSelectedVideoFile(null);
    setEditingVideoId(video.id);
    setFormOpen(true);
  };

  const selectVideoSource = (videoSource: VideoSource) => {
    if (form.video_source === videoSource) return;
    setForm(current => ({ ...current, video_source: videoSource, video_url: '' }));
    setSelectedVideoFile(null);
    clearValidationError('video_url');
  };

  const pickThumbnail = async () => {
    let result: ImagePickerResponse;
    try {
      result = await launchImageLibrary({
        mediaType: 'photo',
        selectionLimit: 1,
        quality: 0.9,
      });
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Youtuble] Image picker failed:', error);
      Alert.alert(
        'Image unavailable',
        getErrorMessage(error, 'Could not open the photo library.'),
      );
      return;
    }
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert(
        'Image unavailable',
        result.errorMessage || 'Could not open the photo library.',
      );
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Image unavailable', 'No thumbnail was selected.');
      return;
    }
    if (asset.fileSize && asset.fileSize > 3 * 1024 * 1024) {
      Alert.alert('Image too large', 'Thumbnail image must be 3 MB or smaller.');
      return;
    }
    const mimeType = asset.type || 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      Alert.alert('Unsupported image', 'Choose a PNG, JPEG, or WEBP image.');
      return;
    }

    setUploadingThumbnail(true);
    try {
      const uploadData = new FormData();
      uploadData.append(
        'file',
        {
          uri: asset.uri,
          name: imageFileName(asset, mimeType.split('/')[1] || 'jpg'),
          type: mimeType,
        } as unknown as Blob,
      );
      const { data } = await api.post<{ image?: string }>(
        '/admin/content/youtube-videos/upload-thumbnail',
        uploadData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      if (typeof data.image !== 'string' || !data.image) {
        throw new Error('The thumbnail upload did not return a saved image.');
      }
      setForm(current => ({
        ...current,
        thumbnail_image: data.image || '',
        thumbnail_url: '',
      }));
      clearValidationError('thumbnail_image');
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Youtuble] Could not upload thumbnail:', error);
      Alert.alert(
        'Could not upload thumbnail',
        getErrorMessage(error, 'Could not upload the thumbnail image.'),
      );
    } finally {
      setUploadingThumbnail(false);
    }
  };

  const pickVideoFile = async () => {
    let result: ImagePickerResponse;
    try {
      result = await launchImageLibrary({
        mediaType: 'video',
        selectionLimit: 1,
        videoQuality: 'high',
      });
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Youtuble] Video picker failed:', error);
      Alert.alert(
        'Video unavailable',
        getErrorMessage(error, 'Could not open the media library.'),
      );
      return;
    }
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert(
        'Video unavailable',
        result.errorMessage || 'Could not open the media library.',
      );
      return;
    }
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert('Video unavailable', 'No video was selected.');
      return;
    }
    const fileNameExtension = asset.fileName?.includes('.')
      ? asset.fileName.split('.').pop()?.toLowerCase()
      : '';
    const extension =
      fileNameExtension ||
      ({
        'video/mp4': 'mp4',
        'video/quicktime': 'mov',
        'video/webm': 'webm',
      }[asset.type || ''] ?? '');
    if (!extension || !['mp4', 'mov', 'webm'].includes(extension)) {
      Alert.alert('Unsupported video', 'Choose an MP4, MOV, or WebM video.');
      return;
    }
    if (asset.fileSize && asset.fileSize > 200 * 1024 * 1024) {
      Alert.alert('Video too large', 'Video files must be 200 MB or smaller.');
      return;
    }
    setSelectedVideoFile({
      uri: asset.uri,
      name: fileNameExtension ? asset.fileName || `video.${extension}` : `video.${extension}`,
      type:
        asset.type ||
        (extension === 'mov'
          ? 'video/quicktime'
          : extension === 'webm'
            ? 'video/webm'
            : 'video/mp4'),
    });
    setForm(current => ({ ...current, video_url: '' }));
    clearValidationError('video_url');
  };

  const uploadDocuments = async () => {
    let selectedFiles: DocumentPickerResponse[];
    try {
      selectedFiles = await pick({
        allowMultiSelection: true,
        type: [
          documentTypes.pdf,
          documentTypes.doc,
          documentTypes.docx,
          documentTypes.xls,
          documentTypes.xlsx,
          documentTypes.plainText,
          'application/rtf',
        ],
      });
    } catch (error: unknown) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        return;
      }
      if (__DEV__) console.warn('[Youtuble] Document picker failed:', error);
      Alert.alert(
        'Documents unavailable',
        getErrorMessage(error, 'Could not open the document picker.'),
      );
      return;
    }
    if (selectedFiles.length > 4 - form.documents.length) {
      Alert.alert('Too many documents', 'You can attach up to 4 documents.');
      return;
    }
    const invalidFile = selectedFiles.find(file => {
      const extension = file.name?.split('.').pop()?.toLowerCase();
      return (
        !file.name ||
        file.name.length > 180 ||
        !extension ||
        !documentExtensions.has(extension) ||
        (file.size != null && file.size > 1024 * 1024)
      );
    });
    if (invalidFile) {
      Alert.alert(
        'Unsupported document',
        `${invalidFile.name || 'This file'}: use PDF, Word, Excel, RTF, or text files up to 1 MB each.`,
      );
      return;
    }

    setUploadingDocuments(true);
    try {
      const uploadData = new FormData();
      selectedFiles.forEach((file, index) => {
        uploadData.append(
          'files',
          {
            uri: file.uri,
            name: file.name || `document-${index + 1}`,
            type: file.type || 'application/octet-stream',
          } as unknown as Blob,
        );
      });
      const { data } = await api.post<{ documents?: SupportingDocument[] }>(
        '/admin/content/youtube-videos/upload-documents',
        uploadData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      if (
        !Array.isArray(data.documents) ||
        data.documents.length !== selectedFiles.length
      ) {
        throw new Error('The upload did not return all saved documents.');
      }
      setForm(current => ({
        ...current,
        documents: [...current.documents, ...data.documents!],
      }));
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Youtuble] Could not upload documents:', error);
      Alert.alert(
        'Could not upload documents',
        getErrorMessage(error, 'Could not upload the selected documents.'),
      );
    } finally {
      setUploadingDocuments(false);
    }
  };

  const updateApplicationLink = (
    index: number,
    field: keyof ApplicationLink,
    value: string,
  ) => {
    setForm(current => ({
      ...current,
      application_links: current.application_links.map((link, linkIndex) =>
        index === linkIndex ? { ...link, [field]: value } : link,
      ),
    }));
    clearValidationError('application_links');
  };

  const submitVideo = async () => {
    if (uploadingVideo) return;
    const errors: ValidationErrors = {};
    if (form.title.trim().length < 2) {
      errors.title = 'Enter a video title with at least 2 characters.';
    }
    if (
      form.video_source === 'link' &&
      !getYoutubeVideoId(form.video_url)
    ) {
      errors.video_url = 'Enter a valid YouTube video URL.';
    }
    if (
      form.video_source === 'upload' &&
      !selectedVideoFile &&
      !/^\/uploads\/youtube-videos\/[\da-f-]+\.(mp4|mov|webm)$/i.test(
        form.video_url,
      )
    ) {
      errors.video_url = 'Choose an MP4, MOV, or WebM video.';
    }
    if (!form.thumbnail_image && !form.thumbnail_url) {
      errors.thumbnail_image = 'Upload a thumbnail image.';
    }
    const invalidLink = form.application_links.some(link => {
      const title = link.title.trim();
      const url = link.url.trim();
      return (title || url) && (!title || !url || !isAllowedWebUrl(url));
    });
    if (invalidLink) {
      errors.application_links =
        'Every application link needs a title and a valid HTTP or HTTPS URL.';
    }
    if (Object.keys(errors).length) {
      setValidationErrors(errors);
      Alert.alert(
        'Check required fields',
        Object.values(errors).join('\n'),
      );
      return;
    }

    setValidationErrors({});
    setSaving(true);
    try {
      let videoUrl = form.video_url.trim();
      if (form.video_source === 'upload' && selectedVideoFile) {
        setUploadingVideo(true);
        const uploadData = new FormData();
        uploadData.append(
          'file',
          {
            uri: selectedVideoFile.uri,
            name: selectedVideoFile.name,
            type: selectedVideoFile.type,
          } as unknown as Blob,
        );
        const uploadResponse = await api.post<{ url?: string }>(
          '/admin/content/youtube-videos/upload-video',
          uploadData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        );
        if (typeof uploadResponse.data.url !== 'string' || !uploadResponse.data.url) {
          throw new Error('The video upload did not return a saved file.');
        }
        videoUrl = uploadResponse.data.url;
      }

      const payload = {
        ...form,
        video_code: form.video_code.trim(),
        title: form.title.trim(),
        video_url: videoUrl,
        description: form.description.trim(),
        thumbnail_url: form.thumbnail_url.trim(),
        application_links: form.application_links
          .filter(link => link.title.trim() || link.url.trim())
          .map(link => ({
            title: link.title.trim(),
            url: link.url.trim(),
          })),
        follow_up_notes: form.follow_up_notes.trim(),
      };
      const { data } = editingVideoId
        ? await api.put<{ video?: VideoRecord }>(
            `/admin/content/youtube-videos/${editingVideoId}`,
            payload,
          )
        : await api.post<{ video?: VideoRecord }>(
            '/admin/content/youtube-videos',
            payload,
          );
      if (!data.video) {
        throw new Error('The server did not return the saved video.');
      }
      const savedVideo = {
        ...data.video,
        application_links: parseJsonArray<ApplicationLink>(
          data.video.application_links,
        ),
        documents: parseJsonArray<SupportingDocument>(data.video.documents),
      };
      setVideos(current =>
        editingVideoId
          ? current.map(video =>
              video.id === editingVideoId ? savedVideo : video,
            )
          : [savedVideo, ...current],
      );
      setFormOpen(false);
      setForm(createEmptyVideo());
      setSelectedVideoFile(null);
      setEditingVideoId(null);
      Alert.alert(
        editingVideoId ? 'Video updated' : 'Video added',
        editingVideoId
          ? 'YouTube video updated successfully.'
          : 'YouTube video added successfully.',
      );
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Youtuble] Could not save video:', error);
      Alert.alert(
        'Could not save video',
        getErrorMessage(error, 'Could not save this video.'),
      );
    } finally {
      setSaving(false);
      setUploadingVideo(false);
    }
  };

  const deleteVideo = (video: VideoRecord) => {
    Alert.alert(
      'Delete video?',
      `Delete "${video.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(video.id);
            try {
              await api.delete(`/admin/content/youtube-videos/${video.id}`);
              setVideos(current =>
                current.filter(entry => entry.id !== video.id),
              );
            } catch (error: unknown) {
              if (__DEV__) console.warn('[Youtuble] Could not delete video:', error);
              Alert.alert(
                'Could not delete video',
                getErrorMessage(error, 'Could not delete this video.'),
              );
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const openExternalLink = async (url: string, fallback: string) => {
    try {
      await Linking.openURL(url);
    } catch (error: unknown) {
      if (__DEV__) console.warn('[Youtuble] Could not open link:', error);
      Alert.alert(
        'Could not open link',
        getErrorMessage(error, fallback),
      );
    }
  };

  const openVideoLink = (video: VideoRecord) =>
    openExternalLink(
      resolveMediaUrl(video.video_url),
      'This video link could not be opened.',
    );

  const removeApplicationLink = (index: number) => {
    setForm(current => ({
      ...current,
      application_links: current.application_links.filter(
        (_, linkIndex) => linkIndex !== index,
      ),
    }));
    clearValidationError('application_links');
  };

  const thumbnailPreview = resolveMediaUrl(
    form.thumbnail_image || form.thumbnail_url,
  );

  return (
    <View className="flex-1 bg-[#F7F8FA]">
      <TopHeader
        pageTitle="YouTube Videos"
        pageSubtitle="Manage videos and supporting information"
        onBackPress={onBackPress}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadVideos(true)}
            tintColor="#F97316"
            colors={['#F97316']}
          />
        }
        contentContainerClassName="px-4 pb-[130px]"
        style={{ paddingTop: insets.top + 76 }}>
        <View className="mb-3 flex-row">
          {[
            { label: 'Total videos', value: videos.length, Icon: Video, color: '#C2410C' },
            { label: 'Active', value: activeCount, Icon: BadgeCheck, color: '#15803D' },
            { label: 'Inactive', value: inactiveCount, Icon: CircleAlert, color: '#B45309' },
          ].map((stat, index) => (
            <View
              key={stat.label}
              className={[
                'flex-1 rounded-[14px] border border-[#FCE6D7] bg-white p-3',
                index ? 'ml-2' : '',
              ].join(' ')}>
              <stat.Icon size={18} color={stat.color} />
              <Text className="mt-2 text-[20px] font-black text-[#17191C]">
                {stat.value}
              </Text>
              <Text className="mt-1 text-[9px] text-[#64748B]">
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        <View className="mb-3 rounded-[14px] border border-[#ECE8E2] bg-white p-3">
          <View className="flex-row items-center rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3">
            <Search size={16} color="#94A3B8" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search videos by title, ID..."
              accessibilityLabel="Search YouTube videos"
              className="ml-2 flex-1 py-2.5 text-[12px] text-[#1E293B]"
            />
            {searchQuery ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear video search"
                onPress={() => setSearchQuery('')}>
                <X size={15} color="#94A3B8" />
              </Pressable>
            ) : null}
          </View>
          <View className="mt-2 flex-row">
            {(['All', 'Active', 'Inactive'] as const).map(filter => (
              <Pressable
                key={filter}
                accessibilityRole="button"
                accessibilityState={{ selected: statusFilter === filter }}
                onPress={() => setStatusFilter(filter)}
                className={[
                  'mr-2 rounded-full px-3 py-1.5',
                  statusFilter === filter ? 'bg-[#FFF1D6]' : 'bg-[#F1F5F9]',
                ].join(' ')}>
                <Text
                  className={[
                    'text-[10px] font-bold',
                    statusFilter === filter
                      ? 'text-[#C2410C]'
                      : 'text-[#64748B]',
                  ].join(' ')}>
                  {filter === 'All' ? 'All statuses' : filter}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {loading ? (
          <View className="items-center rounded-[14px] bg-white py-10">
            <ActivityIndicator color="#F97316" />
            <Text className="mt-2 text-[11px] text-[#64748B]">
              Loading videos...
            </Text>
          </View>
        ) : loadError ? (
          <View className="rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] p-4">
            <Text className="text-[11px] text-[#B91C1C]">{loadError}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => loadVideos()}
              className="mt-2 self-start">
              <Text className="text-[11px] font-bold text-[#991B1B]">Retry</Text>
            </Pressable>
          </View>
        ) : filteredVideos.length ? (
          filteredVideos.map(video => {
            const imageUri = getVideoImage(video);
            return (
              <View
                key={video.id}
                className="mb-3 overflow-hidden rounded-[16px] border border-[#ECE8E2] bg-white">
                {imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    className="h-[170px] w-full bg-[#FFF1D6]"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="h-[120px] items-center justify-center bg-[#FFF1D6]">
                    <Video size={32} color="#C2410C" />
                  </View>
                )}
                <View className="p-3">
                  <View className="flex-row items-start justify-between">
                    <View className="mr-2 flex-1">
                      <Text
                        numberOfLines={2}
                        className="text-[13px] font-bold text-[#17191C]">
                        {video.title}
                      </Text>
                      <Text className="mt-1 text-[10px] font-semibold text-[#C2410C]">
                        {video.video_code}
                      </Text>
                    </View>
                    <Text
                      className={[
                        'rounded-full px-2.5 py-1 text-[9px] font-bold uppercase',
                        video.status === 'Active'
                          ? 'bg-[#DCFCE7] text-[#15803D]'
                          : 'bg-[#F1F5F9] text-[#64748B]',
                      ].join(' ')}>
                      {video.status || 'Inactive'}
                    </Text>
                  </View>
                  {video.description ? (
                    <Text
                      numberOfLines={2}
                      className="mt-2 text-[10px] text-[#64748B]">
                      {video.description}
                    </Text>
                  ) : null}
                  <View className="mt-3 flex-row items-center justify-end border-t border-[#F1F5F9] pt-2">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`View ${video.title}`}
                      onPress={() => setViewVideo(video)}
                      className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-[#FFF1D6]">
                      <Video size={15} color="#C2410C" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${video.title}`}
                      onPress={() => openEditVideoModal(video)}
                      className="mr-2 h-9 w-9 items-center justify-center rounded-full bg-[#FFF1D6]">
                      <Pencil size={14} color="#C2410C" />
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Delete ${video.title}`}
                      disabled={deletingId === video.id}
                      onPress={() => deleteVideo(video)}
                      className="h-9 w-9 items-center justify-center rounded-full bg-[#FEF2F2]">
                      {deletingId === video.id ? (
                        <ActivityIndicator size="small" color="#DC2626" />
                      ) : (
                        <Trash2 size={14} color="#DC2626" />
                      )}
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View className="items-center rounded-[14px] bg-white px-5 py-10">
            <Video size={26} color="#F97316" />
            <Text className="mt-3 text-[12px] font-bold text-[#17191C]">
              {videos.length ? 'No matching videos' : 'No videos yet'}
            </Text>
            <Text className="mt-1 text-[10px] text-[#64748B]">
              {videos.length
                ? 'Try another search or status filter.'
                : 'Add your first YouTube video to get started.'}
            </Text>
          </View>
        )}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add video"
        disabled={loadingVideoCode}
        onPress={openAddVideoModal}
        style={[styles.addVideoFab, addVideoFabPosition]}>
        {loadingVideoCode ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
        )}
      </Pressable>

      <Modal
        visible={formOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!saving && !uploadingThumbnail && !uploadingVideo && !uploadingDocuments) {
            setFormOpen(false);
          }
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1 justify-end bg-black/50">
          <View className="max-h-[96%] rounded-t-[24px] bg-white">
            <View className="flex-row items-center justify-between border-b border-[#F1F5F9] px-5 py-4">
              <View className="flex-1">
                <Text className="text-[17px] font-black text-[#17191C]">
                  {editingVideoId ? 'Edit YouTube video' : 'Add a YouTube video'}
                </Text>
                <Text className="mt-1 text-[10px] text-[#64748B]">
                  {editingVideoId
                    ? `Editing ${form.video_code}`
                    : 'Add a video, application links, and documents'}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close video form"
                disabled={
                  saving ||
                  uploadingThumbnail ||
                  uploadingVideo ||
                  uploadingDocuments
                }
                onPress={() => setFormOpen(false)}
                className="h-9 w-9 items-center justify-center rounded-full bg-[#F1F5F9]">
                <X size={18} color="#475569" />
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerClassName="px-5 pb-4 pt-3">
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Video ID
              </Text>
              <TextInput
                value={form.video_code}
                editable={false}
                className="mb-3 rounded-[11px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2.5 text-[12px] text-[#64748B]"
              />
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Video title *
              </Text>
              <TextInput
                value={form.title}
                onChangeText={value => {
                  setFormField('title', value);
                  clearValidationError('title');
                }}
                placeholder="e.g. Apply for our latest opportunity"
                maxLength={160}
                className="mb-1 rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[13px] text-[#1E293B]"
              />
              {validationErrors.title ? (
                <Text className="mb-3 text-[10px] text-[#DC2626]">
                  {validationErrors.title}
                </Text>
              ) : null}

              <Text className="mb-2 mt-3 text-[11px] font-bold text-[#334155]">
                Video source
              </Text>
              <View className="mb-3 flex-row rounded-[10px] border border-[#E2E8F0] p-1">
                {(['link', 'upload'] as const).map(source => (
                  <Pressable
                    key={source}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.video_source === source }}
                    disabled={saving || uploadingVideo}
                    onPress={() => selectVideoSource(source)}
                    className={[
                      'flex-1 flex-row items-center justify-center rounded-[8px] py-2.5',
                      form.video_source === source ? 'bg-[#FFF1D6]' : '',
                    ].join(' ')}>
                    {source === 'link' ? (
                      <Link2
                        size={14}
                        color={
                          form.video_source === source ? '#C2410C' : '#64748B'
                        }
                      />
                    ) : (
                      <Upload
                        size={14}
                        color={
                          form.video_source === source ? '#C2410C' : '#64748B'
                        }
                      />
                    )}
                    <Text
                      className={[
                        'ml-1.5 text-[10px] font-bold',
                        form.video_source === source
                          ? 'text-[#C2410C]'
                          : 'text-[#64748B]',
                      ].join(' ')}>
                      {source === 'link' ? 'YouTube link' : 'Upload video'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {form.video_source === 'link' ? (
                <>
                  <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                    YouTube video URL *
                  </Text>
                  <TextInput
                    value={form.video_url}
                    onChangeText={value => {
                      setFormField('video_url', value);
                      clearValidationError('video_url');
                    }}
                    placeholder="https://www.youtube.com/watch?v=..."
                    autoCapitalize="none"
                    keyboardType="url"
                    className="mb-1 rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[12px] text-[#1E293B]"
                  />
                </>
              ) : (
                <View className="mb-1 rounded-[12px] border border-[#E2E8F0] p-3">
                  <Text className="mb-2 text-[10px] text-[#64748B]">
                    MP4, MOV, or WebM, up to 200 MB.
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving || uploadingVideo}
                    onPress={pickVideoFile}
                    className="flex-row items-center self-start rounded-[10px] bg-[#FFF1D6] px-3 py-2.5">
                    {uploadingVideo ? (
                      <ActivityIndicator size="small" color="#C2410C" />
                    ) : (
                      <Upload size={15} color="#C2410C" />
                    )}
                    <Text className="ml-2 text-[10px] font-bold text-[#C2410C]">
                      {uploadingVideo
                        ? 'Uploading video...'
                        : selectedVideoFile
                          ? selectedVideoFile.name
                          : form.video_url
                            ? 'Replace video'
                            : 'Choose video'}
                    </Text>
                  </Pressable>
                </View>
              )}
              {validationErrors.video_url ? (
                <Text className="mb-3 text-[10px] text-[#DC2626]">
                  {validationErrors.video_url}
                </Text>
              ) : null}

              <View className="mb-3 mt-4 rounded-[12px] border border-[#E2E8F0] p-3">
                <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                  Thumbnail image *
                </Text>
                <Text className="mb-2 text-[9px] text-[#64748B]">
                  PNG, JPEG, or WEBP, up to 3 MB.
                </Text>
                <View className="flex-row items-center">
                  <Pressable
                    accessibilityRole="button"
                    disabled={saving || uploadingThumbnail}
                    onPress={pickThumbnail}
                    className="flex-row items-center rounded-[10px] bg-[#FFF1D6] px-3 py-2.5">
                    {uploadingThumbnail ? (
                      <ActivityIndicator size="small" color="#C2410C" />
                    ) : (
                      <ImagePlus size={15} color="#C2410C" />
                    )}
                    <Text className="ml-2 text-[10px] font-bold text-[#C2410C]">
                      {uploadingThumbnail ? 'Uploading...' : 'Choose thumbnail'}
                    </Text>
                  </Pressable>
                  {thumbnailPreview ? (
                    <Image
                      source={{ uri: thumbnailPreview }}
                      className="ml-3 h-12 w-20 rounded-[8px] bg-[#F1F5F9]"
                      resizeMode="cover"
                    />
                  ) : null}
                  {thumbnailPreview ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Remove thumbnail"
                      onPress={() =>
                        setForm(current => ({
                          ...current,
                          thumbnail_image: '',
                          thumbnail_url: '',
                        }))
                      }
                      className="ml-2">
                      <X size={16} color="#DC2626" />
                    </Pressable>
                  ) : null}
                </View>
                {validationErrors.thumbnail_image ? (
                  <Text className="mt-2 text-[10px] text-[#DC2626]">
                    {validationErrors.thumbnail_image}
                  </Text>
                ) : null}
              </View>

              <View className="mb-3 rounded-[12px] border border-[#E2E8F0] p-3">
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-[11px] font-bold text-[#334155]">
                      Application links
                    </Text>
                    <Text className="mt-1 text-[9px] text-[#64748B]">
                      Add buttons with a title and HTTPS/HTTP URL.
                    </Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    disabled={form.application_links.length >= 20}
                    onPress={() =>
                      setForm(current => ({
                        ...current,
                        application_links: [
                          ...current.application_links,
                          { title: '', url: '' },
                        ],
                      }))
                    }
                    className="flex-row items-center rounded-full bg-[#FFF1D6] px-2.5 py-1.5">
                    <Plus size={12} color="#C2410C" />
                    <Text className="ml-1 text-[9px] font-bold text-[#C2410C]">
                      Add link
                    </Text>
                  </Pressable>
                </View>
                {form.application_links.map((link, index) => (
                  <View
                    key={`application-link-${index}`}
                    className="mb-2 rounded-[10px] bg-[#F8FAFC] p-2.5">
                    <TextInput
                      value={link.title}
                      onChangeText={value =>
                        updateApplicationLink(index, 'title', value)
                      }
                      placeholder={`Link ${index + 1} title`}
                      maxLength={120}
                      className="mb-2 rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-2 text-[11px] text-[#1E293B]"
                    />
                    <View className="flex-row items-center">
                      <TextInput
                        value={link.url}
                        onChangeText={value =>
                          updateApplicationLink(index, 'url', value)
                        }
                        placeholder="https://example.com/apply"
                        autoCapitalize="none"
                        keyboardType="url"
                        maxLength={2048}
                        className="flex-1 rounded-[8px] border border-[#E2E8F0] bg-white px-3 py-2 text-[11px] text-[#1E293B]"
                      />
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove application link ${index + 1}`}
                        disabled={form.application_links.length === 1}
                        onPress={() => removeApplicationLink(index)}
                        className="ml-2 h-8 w-8 items-center justify-center">
                        <X
                          size={15}
                          color={
                            form.application_links.length === 1
                              ? '#CBD5E1'
                              : '#DC2626'
                          }
                        />
                      </Pressable>
                    </View>
                  </View>
                ))}
                {validationErrors.application_links ? (
                  <Text className="text-[10px] text-[#DC2626]">
                    {validationErrors.application_links}
                  </Text>
                ) : null}
              </View>

              <View className="mb-3 rounded-[12px] border border-[#E2E8F0] p-3">
                <Text className="text-[11px] font-bold text-[#334155]">
                  Supporting documents
                </Text>
                <Text className="mb-2 mt-1 text-[9px] text-[#64748B]">
                  Up to 4 PDF, Word, Excel, RTF, or text files, max 1 MB each.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={uploadingDocuments || form.documents.length >= 4}
                  onPress={uploadDocuments}
                  className="flex-row items-center self-start rounded-[10px] bg-[#FFF1D6] px-3 py-2.5">
                  {uploadingDocuments ? (
                    <ActivityIndicator size="small" color="#C2410C" />
                  ) : (
                    <Upload size={14} color="#C2410C" />
                  )}
                  <Text className="ml-2 text-[10px] font-bold text-[#C2410C]">
                    {uploadingDocuments
                      ? 'Uploading documents...'
                      : 'Choose documents'}
                  </Text>
                </Pressable>
                {form.documents.map((document, index) => (
                  <View
                    key={`${document.url}-${index}`}
                    className="mt-2 flex-row items-center rounded-[9px] bg-[#F8FAFC] px-2.5 py-2">
                    <FileText size={14} color="#C2410C" />
                    <Text
                      numberOfLines={1}
                      className="ml-2 flex-1 text-[10px] text-[#334155]">
                      {document.name}
                    </Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${document.name}`}
                      onPress={() =>
                        setForm(current => ({
                          ...current,
                          documents: current.documents.filter(
                            (_, documentIndex) => documentIndex !== index,
                          ),
                        }))
                      }>
                      <X size={15} color="#DC2626" />
                    </Pressable>
                  </View>
                ))}
              </View>

              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Follow-up notes
              </Text>
              <TextInput
                value={form.follow_up_notes}
                onChangeText={value => setFormField('follow_up_notes', value)}
                placeholder="Instructions or follow-up details..."
                maxLength={5000}
                multiline
                textAlignVertical="top"
                className="mb-3 min-h-[76px] rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[12px] text-[#1E293B]"
              />
              <Text className="mb-1 text-[11px] font-bold text-[#334155]">
                Description
              </Text>
              <TextInput
                value={form.description}
                onChangeText={value => setFormField('description', value)}
                placeholder="Short description for this video..."
                maxLength={5000}
                multiline
                textAlignVertical="top"
                className="mb-3 min-h-[76px] rounded-[11px] border border-[#E2E8F0] px-3 py-2.5 text-[12px] text-[#1E293B]"
              />
              <Text className="mb-2 text-[11px] font-bold text-[#334155]">
                Status
              </Text>
              <View className="mb-2 flex-row">
                {(['Active', 'Inactive'] as const).map(status => (
                  <Pressable
                    key={status}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.status === status }}
                    onPress={() => setFormField('status', status)}
                    className={[
                      'mr-2 rounded-full px-3 py-1.5',
                      form.status === status
                        ? 'bg-[#FFF1D6]'
                        : 'bg-[#F1F5F9]',
                    ].join(' ')}>
                    <Text
                      className={[
                        'text-[10px] font-bold',
                        form.status === status
                          ? 'text-[#C2410C]'
                          : 'text-[#64748B]',
                      ].join(' ')}>
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>
            <View
              className="flex-row justify-end border-t border-[#F1F5F9] px-5 pt-3"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
              <Pressable
                accessibilityRole="button"
                disabled={saving}
                onPress={() => setFormOpen(false)}
                className="mr-2 rounded-[11px] px-4 py-3">
                <Text className="text-[12px] font-bold text-[#475569]">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={
                  saving ||
                  uploadingThumbnail ||
                  uploadingVideo ||
                  uploadingDocuments
                }
                onPress={submitVideo}
                className="flex-row items-center rounded-[11px] bg-[#F97316] px-4 py-3">
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : editingVideoId ? (
                  <Pencil size={14} color="#FFFFFF" />
                ) : (
                  <Plus size={15} color="#FFFFFF" />
                )}
                <Text className="ml-2 text-[11px] font-bold text-white">
                  {saving
                    ? 'Saving video...'
                    : editingVideoId
                      ? 'Save changes'
                      : 'Add video'}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={viewVideo !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewVideo(null)}>
        <View className="flex-1 justify-center bg-black/50 px-5">
          <View className="max-h-[85%] rounded-[20px] bg-white p-5">
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-[15px] font-black text-[#17191C]">
                  {viewVideo?.title}
                </Text>
                <Text className="mt-1 text-[10px] text-[#64748B]">
                  {viewVideo?.video_code}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close video details"
                onPress={() => setViewVideo(null)}
                className="h-8 w-8 items-center justify-center rounded-full bg-[#F1F5F9]">
                <X size={16} color="#475569" />
              </Pressable>
            </View>
            {viewVideo && getVideoImage(viewVideo) ? (
              <Image
                source={{ uri: getVideoImage(viewVideo) }}
                className="mt-4 h-[190px] w-full rounded-[12px] bg-[#F1F5F9]"
                resizeMode="cover"
              />
            ) : null}
            <ScrollView className="mt-3" showsVerticalScrollIndicator={false}>
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  if (viewVideo) openVideoLink(viewVideo);
                }}
                className="flex-row items-center self-start rounded-[9px] bg-[#FFF1D6] px-3 py-2">
                <Link2 size={14} color="#C2410C" />
                <Text className="ml-2 text-[10px] font-bold text-[#C2410C]">
                  Open video
                </Text>
              </Pressable>
              {viewVideo?.description ? (
                <Text className="mt-3 text-[11px] leading-5 text-[#475569]">
                  {viewVideo.description}
                </Text>
              ) : null}
              {viewVideo?.follow_up_notes ? (
                <View className="mt-3 rounded-[10px] bg-[#FFF7ED] p-3">
                  <Text className="text-[10px] font-bold text-[#92400E]">
                    Follow-up notes
                  </Text>
                  <Text className="mt-1 text-[10px] leading-4 text-[#78350F]">
                    {viewVideo.follow_up_notes}
                  </Text>
                </View>
              ) : null}
              {parseJsonArray<ApplicationLink>(
                viewVideo?.application_links,
              ).map((link, index) => (
                <Pressable
                  key={`${link.url}-${index}`}
                  accessibilityRole="link"
                  onPress={() =>
                    openExternalLink(link.url, 'Could not open this application link.')
                  }
                  className="mt-2 flex-row items-center self-start">
                  <Link2 size={13} color="#C2410C" />
                  <Text className="ml-1 text-[10px] font-bold text-[#C2410C]">
                    {link.title}
                  </Text>
                </Pressable>
              ))}
              {parseJsonArray<SupportingDocument>(
                viewVideo?.documents,
              ).map((document, index) => (
                <Pressable
                  key={`${document.url}-${index}`}
                  accessibilityRole="link"
                  onPress={() =>
                    openExternalLink(
                      resolveMediaUrl(document.url),
                      'Could not open this document.',
                    )
                  }
                  className="mt-2 flex-row items-center self-start">
                  <FileText size={13} color="#64748B" />
                  <Text className="ml-1 text-[10px] text-[#475569]">
                    {document.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View className="mt-4 flex-row justify-end border-t border-[#F1F5F9] pt-3">
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (viewVideo) openEditVideoModal(viewVideo);
                  setViewVideo(null);
                }}
                className="flex-row items-center rounded-[10px] bg-[#F97316] px-4 py-2.5">
                <Pencil size={14} color="#FFFFFF" />
                <Text className="ml-2 text-[10px] font-bold text-white">
                  Edit video
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}