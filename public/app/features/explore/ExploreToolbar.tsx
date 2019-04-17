import React, { PureComponent, ChangeEvent } from 'react';
import { connect } from 'react-redux';
import { hot } from 'react-hot-loader';

import { ExploreId } from 'app/types/explore';
import { DataSourceSelectItem, RawTimeRange, TimeRange, ClickOutsideWrapper, SelectOptionItem } from '@grafana/ui';
import { DataSourcePicker } from 'app/core/components/Select/DataSourcePicker';
import { StoreState } from 'app/types/store';
import {
  changeDatasource,
  clearQueries,
  splitClose,
  runQueries,
  splitOpen,
  changeRefreshInterval,
  toggleLiveStream,
} from './state/actions';
import TimePicker from './TimePicker';
import { RefreshPicker, SetInterval } from '@grafana/ui';
import { ExploreActionButton } from './ExploreActionButton';

enum IconSide {
  left = 'left',
  right = 'right',
}

const createResponsiveButton = (options: {
  splitted: boolean;
  title: string;
  onClick: () => void;
  buttonClassName?: string;
  iconClassName?: string;
  iconSide?: IconSide;
}) => {
  const defaultOptions = {
    iconSide: IconSide.left,
  };
  const props = { ...options, defaultOptions };
  const { title, onClick, buttonClassName, iconClassName, splitted, iconSide } = props;

  return (
    <button className={`btn navbar-button ${buttonClassName ? buttonClassName : ''}`} onClick={onClick}>
      {iconClassName && iconSide === IconSide.left ? <i className={`${iconClassName} icon-margin-right`} /> : null}
      <span className="btn-title">{!splitted ? title : ''}</span>
      {iconClassName && iconSide === IconSide.right ? <i className={`${iconClassName} icon-margin-left`} /> : null}
    </button>
  );
};

enum ActionButtonType {
  RunQuery = 'RunQuery',
  LiveStream = 'LiveStream',
}

interface OwnProps {
  exploreId: ExploreId;
  timepickerRef: React.RefObject<TimePicker>;
  onChangeTime: (range: TimeRange, changedByScanner?: boolean) => void;
}

interface OwnState {
  buttonValue: ActionButtonType;
}

interface StateProps {
  datasourceMissing: boolean;
  exploreDatasources: DataSourceSelectItem[];
  loading: boolean;
  range: RawTimeRange;
  selectedDatasource: DataSourceSelectItem;
  splitted: boolean;
  refreshInterval: string;
  streaming: boolean;
  supportsStreaming: boolean;
  buttonOptions: SelectOptionItem[];
}

interface DispatchProps {
  changeDatasource: typeof changeDatasource;
  clearAll: typeof clearQueries;
  runQueries: typeof runQueries;
  closeSplit: typeof splitClose;
  split: typeof splitOpen;
  changeRefreshInterval: typeof changeRefreshInterval;
  toggleLiveStream: typeof toggleLiveStream;
}

type Props = StateProps & DispatchProps & OwnProps;

export class UnConnectedExploreToolbar extends PureComponent<Props, OwnState> {
  state: OwnState = {
    buttonValue: this.props.streaming ? ActionButtonType.LiveStream : ActionButtonType.RunQuery,
  };

  onChangeDatasource = async option => {
    this.props.changeDatasource(this.props.exploreId, option.value);
  };

  onClearAll = () => {
    this.props.clearAll(this.props.exploreId);
  };

  onRunQuery = () => {
    return this.props.runQueries(this.props.exploreId);
  };

  onCloseTimePicker = () => {
    this.props.timepickerRef.current.setState({ isOpen: false });
  };

  onChangeRefreshInterval = (item: string) => {
    const { changeRefreshInterval, exploreId } = this.props;
    changeRefreshInterval(exploreId, item);
  };

  onLiveStreamChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { exploreId } = this.props;
    this.props.toggleLiveStream(exploreId, event.target.checked);
  };

  onActionButtonTypeChange = (item: SelectOptionItem) => {
    const { exploreId, toggleLiveStream } = this.props;
    if (item.value === ActionButtonType.LiveStream) {
      toggleLiveStream(exploreId, true);
    }

    if (item.value === ActionButtonType.RunQuery) {
      toggleLiveStream(exploreId, false);
    }
    this.setState({ buttonValue: item.value });
  };

  onActionButtonClick = () => {
    const { exploreId, runQueries } = this.props;
    const { buttonValue } = this.state;
    if (buttonValue === ActionButtonType.LiveStream) {
      // Do nothing for now, maybe add 'Pause live streaming' here
    }

    if (buttonValue === ActionButtonType.RunQuery) {
      runQueries(exploreId);
    }
  };

  render() {
    const {
      datasourceMissing,
      exploreDatasources,
      closeSplit,
      exploreId,
      loading,
      range,
      selectedDatasource,
      splitted,
      timepickerRef,
      refreshInterval,
      onChangeTime,
      split,
      streaming,
      supportsStreaming,
      buttonOptions,
    } = this.props;
    const { buttonValue } = this.state;

    return (
      <div className={splitted ? 'explore-toolbar splitted' : 'explore-toolbar'}>
        <div className="explore-toolbar-item">
          <div className="explore-toolbar-header">
            <div className="explore-toolbar-header-title">
              {exploreId === 'left' && (
                <span className="navbar-page-btn">
                  <i className="gicon gicon-explore" />
                  Explore
                </span>
              )}
            </div>
            {splitted && (
              <a className="explore-toolbar-header-close" onClick={() => closeSplit(exploreId)}>
                <i className="fa fa-times fa-fw" />
              </a>
            )}
          </div>
        </div>
        <div className="explore-toolbar-item">
          <div className="explore-toolbar-content">
            {!datasourceMissing ? (
              <div className="explore-toolbar-content-item">
                <div className="datasource-picker">
                  <DataSourcePicker
                    onChange={this.onChangeDatasource}
                    datasources={exploreDatasources}
                    current={selectedDatasource}
                  />
                </div>
              </div>
            ) : null}
            {exploreId === 'left' && !splitted ? (
              <div className="explore-toolbar-content-item">
                {createResponsiveButton({
                  splitted,
                  title: 'Split',
                  onClick: split,
                  iconClassName: 'fa fa-fw fa-columns icon-margin-right',
                  iconSide: IconSide.left,
                })}
              </div>
            ) : null}
            {!streaming && (
              <>
                <div className="explore-toolbar-content-item timepicker">
                  <ClickOutsideWrapper onClick={this.onCloseTimePicker}>
                    <TimePicker ref={timepickerRef} range={range} onChangeTime={onChangeTime} />
                  </ClickOutsideWrapper>

                  <RefreshPicker
                    onIntervalChanged={this.onChangeRefreshInterval}
                    onRefresh={this.onRunQuery}
                    value={refreshInterval}
                    tooltip="Refresh"
                  />
                  {refreshInterval && <SetInterval func={this.onRunQuery} interval={refreshInterval} />}
                </div>

                <div className="explore-toolbar-content-item">
                  <button className="btn navbar-button navbar-button--no-icon" onClick={this.onClearAll}>
                    Clear All
                  </button>
                </div>
              </>
            )}
            {!supportsStreaming && (
              <div className="explore-toolbar-content-item">
                {createResponsiveButton({
                  splitted,
                  title: 'Run Query',
                  onClick: this.onRunQuery,
                  buttonClassName: 'navbar-button--secondary',
                  iconClassName: loading ? 'fa fa-spinner fa-fw fa-spin run-icon' : 'fa fa-level-down fa-fw run-icon',
                  iconSide: IconSide.right,
                })}
              </div>
            )}
            {supportsStreaming && (
              <ExploreActionButton
                buttonOptions={buttonOptions}
                buttonValue={buttonValue}
                loading={loading}
                streaming={streaming}
                onActionButtonTypeChange={this.onActionButtonTypeChange}
                onActionButtonClick={this.onActionButtonClick}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: StoreState, { exploreId }: OwnProps): StateProps => {
  const splitted = state.explore.split;
  const exploreItem = state.explore[exploreId];
  const {
    datasourceInstance,
    datasourceMissing,
    exploreDatasources,
    queryTransactions,
    range,
    refreshInterval,
    streaming,
  } = exploreItem;
  const selectedDatasource = datasourceInstance
    ? exploreDatasources.find(datasource => datasource.name === datasourceInstance.name)
    : undefined;
  const loading = streaming ? true : queryTransactions.some(qt => !qt.done);
  const supportsStreaming = datasourceInstance ? datasourceInstance.supportsStreaming : false;
  const buttonOptions: SelectOptionItem[] = [
    { value: ActionButtonType.RunQuery, label: 'Run Query' },
    { value: ActionButtonType.LiveStream, label: 'Live Streaming' },
  ];

  return {
    datasourceMissing,
    exploreDatasources,
    loading,
    range,
    selectedDatasource,
    splitted,
    refreshInterval,
    streaming,
    supportsStreaming,
    buttonOptions,
  };
};

const mapDispatchToProps: DispatchProps = {
  changeDatasource,
  changeRefreshInterval,
  clearAll: clearQueries,
  runQueries,
  closeSplit: splitClose,
  split: splitOpen,
  toggleLiveStream: toggleLiveStream,
};

export const ExploreToolbar = hot(module)(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(UnConnectedExploreToolbar)
);
