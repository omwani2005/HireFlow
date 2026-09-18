import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Alert } from '../../components/feedback/Alert';
import { LoadingSpinner } from '../../components/feedback/LoadingSpinner';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { getNotificationsApi, markAllNotificationsReadApi, markNotificationReadApi } from '../../services/api';
import { Notification } from '../../types/platform';

export const NotificationsPage = () => {
  const [items, setItems] = useState<Notification[]>([]); const [unread, setUnread] = useState(0); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  useEffect(() => { getNotificationsApi().then(({ notifications, unreadCount }) => { setItems(notifications); setUnread(unreadCount); }).catch((err: Error) => setError(err.message)).finally(() => setLoading(false)); }, []);
  const read = async (item: Notification) => { if (item.readAt) return; await markNotificationReadApi(item._id); setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, readAt: new Date().toISOString() } : entry)); setUnread((value) => Math.max(0, value - 1)); };
  const readAll = async () => { await markAllNotificationsReadApi(); setItems((current) => current.map((entry) => ({ ...entry, readAt: entry.readAt || new Date().toISOString() }))); setUnread(0); };
  return <section className="mx-auto max-w-3xl space-y-5"><div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-teal-600">Updates</p><h1 className="text-3xl font-bold text-slate-900">Notifications</h1></div>{unread > 0 && <Button variant="outline" onClick={() => void readAll()} leftIcon={<CheckCheck className="h-4 w-4" />}>Mark all read</Button>}</div>{error && <Alert variant="error">{error}</Alert>}{loading ? <LoadingSpinner label="Loading notifications…" /> : !items.length ? <Card><CardContent className="py-14 text-center text-slate-500"><Bell className="mx-auto mb-2 h-7 w-7" />You have no notifications yet.</CardContent></Card> : <div className="space-y-3">{items.map((item) => <button type="button" key={item._id} onClick={() => void read(item)} className={`w-full rounded-xl border p-4 text-left ${item.readAt ? 'border-slate-200 bg-white' : 'border-teal-200 bg-teal-50'}`}><div className="flex justify-between gap-3"><p className="font-semibold text-slate-900">{item.title}</p><time className="shrink-0 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</time></div><p className="mt-1 text-sm text-slate-600">{item.message}</p></button>)}</div>}</section>;
};
