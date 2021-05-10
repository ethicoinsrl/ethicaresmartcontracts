module.exports = {
    STATE_REQUESTED: 0,
    STATE_ACTIVE: 1,
    STATE_AWAITINGFORAPPROVAL: 2,
    STATE_AWAITINGFORWITHDRAW: 3,
    STATE_AWAITINGFORREFUND: 4,
    STATE_LOCKED: 5,

    TIME_TO_MAXREQUESTEDSTATETIME: 1 * 60 * 60 * 24 + 300,
    TIME_TO_MAXFUNDRAISINGACTIVETIME: 2 * 60 * 60 * 24 + 300,
    TIME_TO_MAXWAITINGFORAPPROVALTIME: 3 * 60 * 60 * 24 + 300,
    TIME_TO_LOCK: 4 * 60 * 60 * 24 + 300,

    ZERO_ADDRESS: '0x0000000000000000000000000000000000000000',
    DOCTOR_COMMISSION: 5 ,
    ETHICARE_ECOI_INITIAL_BALANCE: '40000000000000000000000000',
    ETHICARE_ECOI_TILL_CAP: '60000000000000000000000000',
    ECOI_CASHBACK_FACTOR: '1000000',
};