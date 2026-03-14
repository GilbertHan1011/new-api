import { API } from './index';

export async function uploadImage(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('只支持图片文件');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('图片大小不能超过 5MB');
  }

  const formData = new FormData();
  formData.append('file', file);

  const res = await API.post('/api/community/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (!res.data?.success) {
    throw new Error(res.data?.message || '上传失败');
  }

  return res.data.data.url;
}
