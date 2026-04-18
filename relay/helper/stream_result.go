package helper

import (
	relaycommon "github.com/QuantumNous/new-api/relay/common"
)

type StreamResult struct {
	status  *relaycommon.StreamStatus
	stopped bool
}

func newStreamResult(status *relaycommon.StreamStatus) *StreamResult {
	return &StreamResult{status: status}
}

func (r *StreamResult) Error(err error) {
	if err == nil {
		return
	}
	r.status.RecordError(err.Error())
}

func (r *StreamResult) Stop(err error) {
	if err != nil {
		r.status.RecordError(err.Error())
	}
	r.status.SetEndReason(relaycommon.StreamEndReasonHandlerStop, err)
	r.stopped = true
}

func (r *StreamResult) Done() {
	r.status.SetEndReason(relaycommon.StreamEndReasonDone, nil)
	r.stopped = true
}

func (r *StreamResult) IsStopped() bool {
	return r.stopped
}

func (r *StreamResult) reset() {
	r.stopped = false
}
