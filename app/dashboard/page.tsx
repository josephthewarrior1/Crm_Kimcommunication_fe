'use client';

import { useEffect, useState } from 'react';
import { crmService } from '../../lib/services/crmService';
import { DashboardSummaryResponse, Event, IndustrySummaryResponse } from '../../lib/types';
import DashboardOverview from './components/DashboardOverview';

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardSummaryResponse | null>(null);
  const [industrySummary, setIndustrySummary] = useState<IndustrySummaryResponse | null>(null);
  const [events, setEvents] = useState<Event[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [summary, eventItems, industries] = await Promise.all([
          crmService.getDashboardSummary(),
          crmService.getEvents().catch(() => null),
          crmService.getIndustrySummary().catch(() => null),
        ]);
        setDashboard(summary);
        setEvents(eventItems);
        setIndustrySummary(industries);
      } catch {
        setDashboard(null);
      } finally {
        setLoading(false);
      }
    }
    void loadData();
  }, []);

  return <DashboardOverview dashboard={dashboard} industrySummary={industrySummary} events={events} loading={loading} />;
}
