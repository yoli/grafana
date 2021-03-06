package provisioning

import (
	"context"
	"github.com/grafana/grafana/pkg/log"
	"github.com/pkg/errors"
	"path"
	"sync"

	"github.com/grafana/grafana/pkg/registry"
	"github.com/grafana/grafana/pkg/services/provisioning/dashboards"
	"github.com/grafana/grafana/pkg/services/provisioning/datasources"
	"github.com/grafana/grafana/pkg/services/provisioning/notifiers"
	"github.com/grafana/grafana/pkg/setting"
)

func init() {
	registry.RegisterService(NewProvisioningServiceImpl(
		func(path string) (dashboards.DashboardProvisioner, error) {
			return dashboards.NewDashboardProvisionerImpl(path)
		},
		notifiers.Provision,
		datasources.Provision,
	))
}

type ProvisioningService interface {
	ProvisionDatasources() error
	ProvisionNotifications() error
	ProvisionDashboards() error
}

func NewProvisioningServiceImpl(
	newDashboardProvisioner dashboards.DashboardProvisionerFactory,
	provisionNotifiers func(string) error,
	provisionDatasources func(string) error,
) *provisioningServiceImpl {
	return &provisioningServiceImpl{
		log:                     log.New("provisioning"),
		newDashboardProvisioner: newDashboardProvisioner,
		provisionNotifiers:      provisionNotifiers,
		provisionDatasources:    provisionDatasources,
	}
}

type provisioningServiceImpl struct {
	Cfg                     *setting.Cfg `inject:""`
	log                     log.Logger
	pollingCtxCancel        context.CancelFunc
	newDashboardProvisioner dashboards.DashboardProvisionerFactory
	dashboardProvisioner    dashboards.DashboardProvisioner
	provisionNotifiers      func(string) error
	provisionDatasources    func(string) error
	mutex                   sync.Mutex
}

func (ps *provisioningServiceImpl) Init() error {
	err := ps.ProvisionDatasources()
	if err != nil {
		return err
	}

	err = ps.ProvisionNotifications()
	if err != nil {
		return err
	}

	err = ps.ProvisionDashboards()
	if err != nil {
		return err
	}

	return nil
}

func (ps *provisioningServiceImpl) Run(ctx context.Context) error {
	for {

		// Wait for unlock. This is tied to new dashboardProvisioner to be instantiated before we start polling.
		ps.mutex.Lock()
		pollingContext, cancelFun := context.WithCancel(ctx)
		ps.pollingCtxCancel = cancelFun
		ps.dashboardProvisioner.PollChanges(pollingContext)
		ps.mutex.Unlock()

		select {
		case <-pollingContext.Done():
			// Polling was canceled.
			continue
		case <-ctx.Done():
			// Root server context was cancelled so just leave.
			return ctx.Err()
		}
	}
}

func (ps *provisioningServiceImpl) ProvisionDatasources() error {
	datasourcePath := path.Join(ps.Cfg.ProvisioningPath, "datasources")
	err := ps.provisionDatasources(datasourcePath)
	return errors.Wrap(err, "Datasource provisioning error")
}

func (ps *provisioningServiceImpl) ProvisionNotifications() error {
	alertNotificationsPath := path.Join(ps.Cfg.ProvisioningPath, "notifiers")
	err := ps.provisionNotifiers(alertNotificationsPath)
	return errors.Wrap(err, "Alert notification provisioning error")
}

func (ps *provisioningServiceImpl) ProvisionDashboards() error {
	dashboardPath := path.Join(ps.Cfg.ProvisioningPath, "dashboards")
	dashProvisioner, err := ps.newDashboardProvisioner(dashboardPath)
	if err != nil {
		return errors.Wrap(err, "Failed to create provisioner")
	}

	ps.mutex.Lock()
	defer ps.mutex.Unlock()

	ps.cancelPolling()

	if err := dashProvisioner.Provision(); err != nil {
		// If we fail to provision with the new provisioner, mutex will unlock and the polling we restart with the
		// old provisioner as we did not switch them yet.
		return errors.Wrap(err, "Failed to provision dashboards")
	}
	ps.dashboardProvisioner = dashProvisioner
	return nil
}

func (ps *provisioningServiceImpl) cancelPolling() {
	if ps.pollingCtxCancel != nil {
		ps.log.Debug("Stop polling for dashboard changes")
		ps.pollingCtxCancel()
	}
	ps.pollingCtxCancel = nil
}
