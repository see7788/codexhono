import { Alert, Collapse, Space, Tabs, Typography } from "antd";
import { hc, type InferResponseType } from "hono/client";
import { useEffect, useState } from "react";
import { useAsyncFn } from "react-use";
import type emailRouter from "honoapp/src/email";

const client = hc<typeof emailRouter>(location.origin);
type Accounts = InferResponseType<typeof client.email.accounts.$get, 200>;
type Messages = InferResponseType<typeof client.email.collect.$post, 200>;

export default function EmailPage() {
  const [accounts, setAccounts] = useState<Accounts>([]);
  const [activeEmail, setActiveEmail] = useState("");
  const [accountsState, loadAccounts] = useAsyncFn(async () => {
    const response = await client.email.accounts.$get();
    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  }, []);
  const [collectState, collect] = useAsyncFn(async (email: string) => {
    const response = await client.email.collect.$post({
      json: {
        email,
      },
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response.json();
  }, []);
  const messages: Messages = collectState.value ?? [];
  const error = accountsState.error?.message || collectState.error?.message || "";

  useEffect(() => {
    loadAccounts().then(accounts => {
      if (accounts) {
        setAccounts(accounts);
        setActiveEmail(current => current || accounts[0]?.username || "");
      }
    });
  }, [loadAccounts]);

  useEffect(() => {
    if (!activeEmail) {
      return;
    }

    collect(activeEmail);
  }, [activeEmail, collect]);

  return (
    <div style={{ height: "100vh", overflow: "auto", padding: 16 }}>
      <style>{`
        .email-page .ant-tabs-tab {
          padding: 12px 8px;
        }

        .email-page .ant-tabs-tab-btn {
          white-space: normal;
        }

        .email-tab-label {
          align-items: center;
          display: inline-flex;
          flex-direction: column;
          line-height: 1;
          max-height: 220px;
          text-align: center;
          word-break: keep-all;
        }

        .email-tab-label span {
          display: block;
        }
      `}</style>
      <Tabs
        activeKey={activeEmail}
        className="email-page"
        tabPlacement="start"
        items={accounts.map(account => ({
          key: account.username,
          label: (
            <div className="email-tab-label">
              {[...account.username].map((char, index) => <span key={`${char}-${index}`}>{char}</span>)}
            </div>
          ),
          children: (
            <>
              {error && <Alert message={error} type="error" style={{ marginBottom: 8 }} />}

              <Space align="center" style={{ marginBottom: 8 }}>
                <Typography.Text type="secondary">{collectState.loading ? "收取中" : `lastUid: ${messages.at(-1)?.uid ?? "-"}`}</Typography.Text>
              </Space>

              {messages.length === 0 ? (
                <Typography.Text type="secondary">暂无邮件</Typography.Text>
              ) : (
                <Collapse
                  items={messages.map(email => ({
                    key: String(email.uid),
                    label: (
                      <Space>
                        <Typography.Text strong>{email.subject || "(无标题)"}</Typography.Text>
                        <Typography.Text type="secondary">UID {email.uid}</Typography.Text>
                      </Space>
                    ),
                    children: (
                      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
                        <Typography.Text type="secondary">
                          {email.from.map(item => item.address || item.name).filter(Boolean).join(", ")}
                        </Typography.Text>
                        <Typography.Paragraph style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                          {email.text || email.html || ""}
                        </Typography.Paragraph>
                        {email.attachments.length > 0 && (
                          <Typography.Text type="secondary">
                            附件：{email.attachments.map(item => item.filename || item.contentType).join(", ")}
                          </Typography.Text>
                        )}
                      </Space>
                    ),
                  }))}
                />
              )}
            </>
          ),
        }))}
        onChange={email => setActiveEmail(email)}
      />
    </div>
  );
}
