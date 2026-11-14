import { When, Then, expect } from './fixtures';
import { WHO_RE, actorFor, fill, jsonBody, jsonPath, rememberPlan, rememberReceipt } from './new.helpers';

/**
 * Bước gọi API có thân JSON và đọc trường của phản hồi, dùng cho các tính năng bổ sung 13–14/11/2026.
 * Động từ là "gửi" (không phải "gọi") để không trùng các bước "… gọi POST "/api/…"" có sẵn.
 *
 *   Khi Admin gửi POST "/api/plans" với JSON:
 *     """
 *     { "type": "in", "partnerId": "NCC-01", "lines": [{ "productId": "${prod.id}", "qty": 5 }] }
 *     """
 *
 * Biến ${…} xem `fill()` trong new.helpers.ts.
 */

When(new RegExp(`^(${WHO_RE}) gửi (GET|POST|PUT|DELETE) "([^"]+)"(?: với JSON:)?$`), async ({ world }, who: string, method: string, path: string, doc?: string) => {
  const url = await fill(world, path);
  const body = doc !== undefined ? await jsonBody(world, doc) : method === 'GET' || method === 'DELETE' ? undefined : {};
  await world.call(actorFor(world, who), method, url, body);
  if (method === 'POST' && url === '/api/plans') rememberPlan(world);
  if (method === 'POST' && url === '/api/receipts') rememberReceipt(world);
  if (method === 'POST' && url === '/api/users' && world.last?.status === 200) world.extraUsers.push(world.last.json.id);
});

Then(/^trường "([^"]+)" của phản hồi là "(.*)"$/, async ({ world }, path: string, want: string) => {
  expect(world.last, 'chưa gọi API').not.toBeNull();
  const got = jsonPath(world.last!.json, path);
  const expected = await fill(world, want);
  if (expected === 'null') expect(got ?? null, `${path} trong ${world.last!.text.slice(0, 300)}`).toBeNull();
  else expect(String(got), `${path} trong ${world.last!.text.slice(0, 300)}`).toBe(expected);
});

Then(/^trường "([^"]+)" của phản hồi chứa "(.*)"$/, async ({ world }, path: string, want: string) => {
  const got = jsonPath(world.last!.json, path);
  expect(String(got), `${path} trong ${world.last!.text.slice(0, 300)}`).toContain(await fill(world, want));
});

Then(/^phản hồi có trường "([^"]+)"$/, async ({ world }, path: string) => {
  expect(jsonPath(world.last!.json, path), `${path} trong ${world.last!.text.slice(0, 300)}`).toBeDefined();
});

Then(/^trường "([^"]+)" của phản hồi khớp "(.+)"$/, async ({ world }, path: string, re: string) => {
  expect(String(jsonPath(world.last!.json, path)), `${path} trong ${world.last!.text.slice(0, 300)}`).toMatch(new RegExp(re));
});
