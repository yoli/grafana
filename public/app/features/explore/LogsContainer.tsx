import React, { PureComponent } from 'react';
import { hot } from 'react-hot-loader';
import { connect } from 'react-redux';
import moment, { Moment } from 'moment';
import { RawTimeRange, TimeRange, LogLevel } from '@grafana/ui';

import { ExploreId, ExploreItemState } from 'app/types/explore';
import { LogsModel, LogsDedupStrategy, LogRowModel } from 'app/core/logs_model';
import { StoreState } from 'app/types';

import { toggleLogs, changeDedupStrategy } from './state/actions';
import Logs from './Logs';
import Panel from './Panel';
import { toggleLogLevelAction } from 'app/features/explore/state/actionTypes';
import { deduplicatedLogsSelector, exploreItemUIStateSelector } from 'app/features/explore/state/selectors';

interface LogsContainerProps {
  exploreId: ExploreId;
  loading: boolean;
  logsHighlighterExpressions?: string[];
  logsResult?: LogsModel;
  dedupedResult?: LogsModel;
  onChangeTime: (range: TimeRange) => void;
  onClickLabel: (key: string, value: string) => void;
  onStartScanning: () => void;
  onStopScanning: () => void;
  range: RawTimeRange;
  scanning?: boolean;
  scanRange?: RawTimeRange;
  showingLogs: boolean;
  toggleLogs: typeof toggleLogs;
  toggleLogLevelAction: typeof toggleLogLevelAction;
  changeDedupStrategy: typeof changeDedupStrategy;
  dedupStrategy: LogsDedupStrategy;
  hiddenLogLevels: Set<LogLevel>;
  width: number;
  streaming: boolean;
  streamingOldRows: LogRowModel[];
  streamingFreshRows: LogRowModel[];
  streamingLastUpdate: Moment;
}

export class LogsContainer extends PureComponent<LogsContainerProps> {
  onClickLogsButton = () => {
    this.props.toggleLogs(this.props.exploreId, this.props.showingLogs);
  };

  handleDedupStrategyChange = (dedupStrategy: LogsDedupStrategy) => {
    this.props.changeDedupStrategy(this.props.exploreId, dedupStrategy);
  };

  hangleToggleLogLevel = (hiddenLogLevels: Set<LogLevel>) => {
    const { exploreId } = this.props;
    this.props.toggleLogLevelAction({
      exploreId,
      hiddenLogLevels,
    });
  };

  render() {
    const {
      exploreId,
      loading,
      logsHighlighterExpressions,
      logsResult,
      dedupedResult,
      onChangeTime,
      onClickLabel,
      onStartScanning,
      onStopScanning,
      range,
      showingLogs,
      scanning,
      scanRange,
      width,
      hiddenLogLevels,
      streaming,
      streamingOldRows,
      streamingFreshRows,
      streamingLastUpdate,
    } = this.props;

    const now = moment();
    const lastUpdatedDate = moment.duration(now.diff(streamingLastUpdate));
    const lastUpdated = streamingLastUpdate
      ? `Data last updated ${lastUpdatedDate.asSeconds()}s`
      : 'Waiting for data...';

    return (
      <Panel label="Logs" loading={loading} isOpen={showingLogs} onToggle={this.onClickLogsButton}>
        {streaming && (
          <div>
            <div className="logs-panel-meta">
              <span>{lastUpdated}</span>
            </div>
            <div>
              {streamingFreshRows.map((row, index) => {
                return (
                  <div className="logs-row fresh" key={`${row.key}-${index}`}>
                    <div className="logs-row__localtime" title={`${row.timestamp} (${row.timeFromNow})`}>
                      {row.timeLocal}
                    </div>
                    <div className="logs-row__message">{row.entry}</div>
                  </div>
                );
              })}
              {streamingOldRows.map((row, index) => {
                return (
                  <div className="logs-row old" key={`${row.key}-${index}`}>
                    <div className="logs-row__localtime" title={`${row.timestamp} (${row.timeFromNow})`}>
                      {row.timeLocal}
                    </div>
                    <div className="logs-row__message">{row.entry}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {!streaming && (
          <Logs
            dedupStrategy={this.props.dedupStrategy || LogsDedupStrategy.none}
            data={logsResult}
            dedupedData={dedupedResult}
            exploreId={exploreId}
            key={logsResult && logsResult.id}
            highlighterExpressions={logsHighlighterExpressions}
            loading={loading}
            onChangeTime={onChangeTime}
            onClickLabel={onClickLabel}
            onStartScanning={onStartScanning}
            onStopScanning={onStopScanning}
            onDedupStrategyChange={this.handleDedupStrategyChange}
            onToggleLogLevel={this.hangleToggleLogLevel}
            range={range}
            scanning={scanning}
            scanRange={scanRange}
            width={width}
            hiddenLogLevels={hiddenLogLevels}
          />
        )}
      </Panel>
    );
  }
}

function mapStateToProps(state: StoreState, { exploreId }) {
  const explore = state.explore;
  const item: ExploreItemState = explore[exploreId];
  const {
    logsHighlighterExpressions,
    logsResult,
    queryTransactions,
    scanning,
    scanRange,
    range,
    streaming,
    streamingFreshRows,
    streamingOldRows,
    streamingLastUpdate,
  } = item;
  const loading = streaming ? true : queryTransactions.some(qt => qt.resultType === 'Logs' && !qt.done);
  const { showingLogs, dedupStrategy } = exploreItemUIStateSelector(item);
  const hiddenLogLevels = new Set(item.hiddenLogLevels);
  const dedupedResult = deduplicatedLogsSelector(item);

  return {
    loading,
    logsHighlighterExpressions,
    logsResult,
    scanning,
    scanRange,
    showingLogs,
    range,
    dedupStrategy,
    hiddenLogLevels,
    dedupedResult,
    streaming,
    streamingFreshRows,
    streamingOldRows,
    streamingLastUpdate,
  };
}

const mapDispatchToProps = {
  toggleLogs,
  changeDedupStrategy,
  toggleLogLevelAction,
};

export default hot(module)(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(LogsContainer)
);
