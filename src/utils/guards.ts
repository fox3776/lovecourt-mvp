import type { CaseSummary } from '@/types';

export function requireSummary(summary?: CaseSummary | null) {
  if (!summary) {
    uni.showToast({
      title: '请先完成案情检举',
      icon: 'none',
    });
    setTimeout(() => {
      uni.switchTab({
        url: '/pages/index',
      });
    }, 800);
    return false;
  }
  return true;
}
