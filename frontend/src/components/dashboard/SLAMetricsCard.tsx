import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, DatePicker, Space, Spin } from 'antd';
import { CheckCircleOutlined, WarningOutlined, ClockCircleOutlined } from '@ant-design/icons';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const { RangePicker } = DatePicker;

interface SLAMetrics {
  totalTickets: number;
  responseSlaMet: number;
  responseSlaMissed: number;
  resolutionSlaMet: number;
  resolutionSlaMissed: number;
  responseCompliancePercentage: number;
  resolutionCompliancePercentage: number;
}

interface SLAMetricsCardProps {
  organizationId: number;
}

const SLAMetricsCard: React.FC<SLAMetricsCardProps> = ({ organizationId }) => {
  const [metrics, setMetrics] = useState<SLAMetrics | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [dateRange, setDateRange] = useState<[Date, Date]>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // Default to last 30 days
    return [start, end];
  });

  const fetchMetrics = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/sla/metrics`, {
        params: {
          startDate: dateRange[0].toISOString(),
          endDate: dateRange[1].toISOString(),
          organizationId
        }
      });
      
      setMetrics(response.data);
    } catch (error) {
      console.error('Error fetching SLA metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [organizationId, dateRange]);

  const handleDateRangeChange = (dates: any) => {
    if (dates && dates.length === 2) {
      setDateRange([dates[0].toDate(), dates[1].toDate()]);
    }
  };

  if (!metrics && loading) {
    return (
      <Card title="SLA Compliance">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="SLA Compliance" 
      extra={
        <Space>
          <RangePicker 
            onChange={handleDateRangeChange} 
            defaultValue={[
              dateRange[0] && (dateRange[0] as any)._d ? (dateRange[0] as any)._d : dateRange[0],
              dateRange[1] && (dateRange[1] as any)._d ? (dateRange[1] as any)._d : dateRange[1]
            ]} 
          />
        </Space>
      }
    >
      <Row gutter={16}>
        <Col span={8}>
          <Statistic 
            title="Total Tickets" 
            value={metrics?.totalTickets || 0} 
          />
        </Col>
        <Col span={8}>
          <Card title="First Response SLA" size="small" bordered={false}>
            <Row align="middle" gutter={16}>
              <Col span={12}>
                <Progress 
                  type="circle" 
                  percent={Math.round(metrics?.responseCompliancePercentage || 0)} 
                  status={
                    (metrics?.responseCompliancePercentage || 0) < 80 ? 'exception' : 'success'
                  }
                  width={80}
                />
              </Col>
              <Col span={12}>
                <p>
                  <CheckCircleOutlined style={{ color: 'green' }} /> Met: {metrics?.responseSlaMet || 0}
                </p>
                <p>
                  <WarningOutlined style={{ color: 'red' }} /> Missed: {metrics?.responseSlaMissed || 0}
                </p>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Resolution SLA" size="small" bordered={false}>
            <Row align="middle" gutter={16}>
              <Col span={12}>
                <Progress 
                  type="circle" 
                  percent={Math.round(metrics?.resolutionCompliancePercentage || 0)} 
                  status={
                    (metrics?.resolutionCompliancePercentage || 0) < 80 ? 'exception' : 'success'
                  }
                  width={80}
                />
              </Col>
              <Col span={12}>
                <p>
                  <CheckCircleOutlined style={{ color: 'green' }} /> Met: {metrics?.resolutionSlaMet || 0}
                </p>
                <p>
                  <WarningOutlined style={{ color: 'red' }} /> Missed: {metrics?.resolutionSlaMissed || 0}
                </p>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </Card>
  );
};

export default SLAMetricsCard; 