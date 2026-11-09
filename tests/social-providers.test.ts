import { appSocialProviders } from '@/features/auth/providers';

describe('appSocialProviders', () => {
  it('hides every button when the API cannot return to the app (production today)', () => {
    expect(appSocialProviders({ providers: ['google', 'facebook'], firebase: { enabled: false, providers: [] } })).toEqual([]);
  });

  it('hides buttons before the providers call has answered', () => {
    expect(appSocialProviders(undefined)).toEqual([]);
  });

  it('requires PKCE support', () => {
    expect(appSocialProviders({ providers: ['google'], appClient: { pkce: false, providers: ['google'] } })).toEqual([]);
  });

  it('shows only providers that are both configured and app-capable', () => {
    expect(
      appSocialProviders({ providers: ['google', 'facebook'], appClient: { pkce: true, providers: ['google', 'tiktok'] } }),
    ).toEqual(['google']);
    expect(appSocialProviders({ providers: ['facebook'], appClient: { pkce: true, providers: ['google', 'facebook'] } })).toEqual([
      'facebook',
    ]);
  });
});
