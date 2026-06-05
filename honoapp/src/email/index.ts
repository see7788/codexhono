import { zValidator } from "@hono/zod-validator";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import type { AddressObject } from "mailparser";
import { Hono } from "hono";
import { z } from "zod";

const accounts: Array<{
  /** IMAP 服务器地址，例如 imap.qq.com */
  host: string;
  /** IMAP 端口，默认 993 */
  port?: number;
  /** 是否使用 SSL/TLS，默认 true */
  secure?: boolean;
  /** 邮箱账号 */
  username: string;
  /** 邮箱密码或授权码 */
  password: string;
  /** 邮箱目录，默认 INBOX */
  mailbox?: string;
  /** 只收取大于该 UID 的邮件 */
  sinceUid?: number;
  /** 是否只收未读邮件 */
  unseenOnly?: boolean;
  /** 最多返回多少封邮件 */
  limit?: number;
  /** 收取后是否标记为已读 */
  markSeen?: boolean;
}> = [
  {
    host: "imap.qq.com",
    port: 993,
    secure: true,
    username: "kitchens@qq.com",
    password: "nzuuabebvuhxjeha",//smtp授权码，密码qy20130719
    mailbox: "INBOX",
    limit: 20,
    unseenOnly: false,
    markSeen: false,
  },
];

export default new Hono().basePath("/email")
  .get("/accounts", c => c.json(accounts))
  .post(
    "/collect",
    zValidator("json", z.object({
      email: z.string().min(1),
    })),
    async c => {
      const payload = c.req.valid("json");
      const account = accounts.find(item => item.username === payload.email)!;
      const mailbox = account.mailbox ?? "INBOX";
      const client = new ImapFlow({
        host: account.host,
        port: account.port ?? 993,
        secure: account.secure ?? true,
        auth: {
          user: account.username,
          pass: account.password,
        },
        logger: false,
      });

      await client.connect();
      const lock = await client.getMailboxLock(mailbox);

      try {
        const search = account.unseenOnly
          ? { seen: false, uid: `${(account.sinceUid ?? 0) + 1}:*` }
          : { uid: `${(account.sinceUid ?? 0) + 1}:*` };
        const foundUids = await client.search(search, { uid: true });
        const uids = foundUids === false ? [] : foundUids;
        const targetUids = typeof account.limit === "number" ? uids.slice(-account.limit) : uids;

        const toAddressList = (value: AddressObject | AddressObject[] | undefined) => {
          if (!value) {
            return [];
          }

          const addresses = Array.isArray(value) ? value.flatMap((item) => item.value) : value.value;
          return addresses.map((item) => ({
            name: item.name || undefined,
            address: item.address || undefined,
          }));
        };
        const messages: Array<{
          /** IMAP UID */
          uid: number;
          /** 邮件 Message-ID */
          messageId?: string;
          /** 来源邮箱目录 */
          mailbox: string;
          /** 邮件标题 */
          subject?: string;
          /** 发件人 */
          from: ReturnType<typeof toAddressList>;
          /** 收件人 */
          to: ReturnType<typeof toAddressList>;
          /** 抄送人 */
          cc: ReturnType<typeof toAddressList>;
          /** 密送人 */
          bcc: ReturnType<typeof toAddressList>;
          /** 回复地址 */
          replyTo: ReturnType<typeof toAddressList>;
          /** 邮件发送时间 */
          date?: Date;
          /** 服务器收信时间 */
          receivedAt?: Date;
          /** 纯文本正文 */
          text?: string;
          /** HTML 正文 */
          html?: string;
          /** 附件元信息，不包含附件内容 */
          attachments: Array<Omit<Awaited<ReturnType<typeof simpleParser>>["attachments"][number], "content" | "related">>;
          /** IMAP flags */
          flags: string[];
        }> = [];

        for await (const message of client.fetch(targetUids, {
          flags: true,
          internalDate: true,
          source: true,
        }, { uid: true })) {
          if (!message.source) {
            continue;
          }

          const parsed = await simpleParser(message.source, {});
          messages.push({
            uid: message.uid,
            messageId: parsed.messageId,
            mailbox,
            subject: parsed.subject,
            from: toAddressList(parsed.from),
            to: toAddressList(parsed.to),
            cc: toAddressList(parsed.cc),
            bcc: toAddressList(parsed.bcc),
            replyTo: toAddressList(parsed.replyTo),
            date: parsed.date,
            receivedAt: message.internalDate instanceof Date ? message.internalDate : undefined,
            text: parsed.text,
            html: typeof parsed.html === "string" ? parsed.html : undefined,
            attachments: parsed.attachments.map(({ content, related, ...attachment }) => attachment),
            flags: message.flags ? [...message.flags] : [],
          });
        }

        messages.sort((left, right) => left.uid - right.uid);

        if (account.markSeen && targetUids.length > 0) {
          await client.messageFlagsAdd(targetUids, ["\\Seen"], { uid: true });
        }

        return c.json(messages);
      } finally {
        lock.release();
        await client.logout();
      }
    },
  );
