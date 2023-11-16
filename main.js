import './assets/scss/all.scss';

import { createApp } from 'https://unpkg.com/vue@3/dist/vue.esm-browser.js';
import FileSaver from 'file-saver';
import * as XLSX from 'xlsx';

const YYYY = new Date().getFullYear();
const MM = (new Date().getMonth() + 1).toString().padStart(2, '0');
const dd = new Date().getDate().toString().padStart(2, '0');;

const app = Vue.createApp({
    data() {
        return {
            isLoading: false,
            stations: [
                {
                    "id": "401",
                    "type": "助安A3新北產業園區站"
                },
                {
                    "id": "402",
                    "type": "助安A4新莊副都心站"
                },
                {
                    "id": "403",
                    "type": "助安A5泰山站"
                },
                {
                    "id": "404",
                    "type": "助安A6泰山貴和站"
                },
                {
                    "id": "405",
                    "type": "助安A7體育大學站"
                },
            ],
            stationId: '',
            // 即時現況
            todayAllData: [],
            todayElectric: [],
            // 時段流量
            flowData: [],
            organizedMonthFlowData: [], // 以日為單位的時段流量資料
            organizedDateFlowData: [], // 以小時為單位的時段流量資料
            flowDateData: [],
            searchFlowMonthData: {}, // 按月搜尋時段流量
            searchFlowDateData: {}, // 按日搜尋時段流量
            // 交易明細
            today: '',
            transactionDetails: [],
            // 搜尋交易明細
            searchTransactionDetailsData: {
                "isElectric": true,
                "startTime": '',
                "endTime": ''
            },
            // 交易統計
            transactionStatisticsAll: [],
            // 搜尋交易統計
            searchTransactionStatisticsData: {
                isElectric: true,
                startTime: "",
                endTime: ""
            },
        }
    },
    methods: {
        // getStationList
        getStations() {
            const getStationsApi = `/api/station`;
            this.isLoading = true;
            axios
                .get(getStationsApi)
                .then((response) => {
                    this.isLoading = false;
                    this.stations = response.data;
                    this.stationId = this.stations[0].id; // Set first station as default
                    // Real-time status
                    setInterval(this.getTodayAll(), 1800000);
                    setInterval(this.getTodayElectric(), 1800000);
                })
        },
        getThisStation() {
            this.getTodayAll();
            this.getTodayElectric();
            if (flowMonthTable.classList[2] == 'block'){
                this.searchFlowMonth();
            } else {
                this.searchFlowDate();
            }
            this.searchTransactionDetails();
            this.searchTransactionStatistic();
        },
        // Real-time status
        // Real-time status - Get today's parking data
        getTodayAll() {
            const getTodayAllApi = `/api/today/all`;
            this.isLoading = true;
            axios
                .post(getTodayAllApi, { target: { stationId: this.stationId } })
                .then((response) => {
                    this.todayAllData = response.data;
                    this.isLoading = false;
                })
        },
        // Real-time status - Get today's EV parking data 
        getTodayElectric() {
            this.isLoading = true;
            const getTodayElectricApi = `/api/today/electric`;
            axios
                .post(getTodayElectricApi, { target: { stationId: this.stationId } })
                .then((response) => {
                    this.todayElectric = response.data;
                    this.isLoading = false;
                })
        },
        // Period traffic flow
        // Period traffic flow - Default current month
        thisMonthFlow() {
            this.searchFlowMonthData.Time = YYYY + '-' + MM;
        },
        // Period traffic flow - Search by month
        searchFlowMonth(searchFlowMonth) {
            const searchFlowMonthApi = `/api/flow`;
            const cantFindArea = document.querySelector('.cantFind-Area-flow');
            this.isLoading = true;
            this.searchFlowMonthData.stationId = this.stationId;
            axios
                .post(searchFlowMonthApi, { target: this.searchFlowMonthData })
                .then((response) => {
                    this.isLoading = false;
                    this.flowData = response.data;
                    const flowMonthTable = document.querySelector('.flowMonthTable');
                    const flowDateTable = document.querySelector('.flowDateTable');
                    flowMonthTable.classList.remove('d-none');
                    flowMonthTable.classList.add('block');
                    flowDateTable.classList.remove('block');
                    flowDateTable.classList.add('d-none');
                    // Organize data by date (reduce)
                    this.organizedMonthFlowData = this.flowData.reduce((acc, entry) => {
                        const { TRANSDATE, carType, direction, countPlate } = entry;
                        // Set identity and entry/exit type
                        let type;
                        if (carType === 1 && direction === 0) {
                            type = "monthIn";
                        } else if (carType === 1 && direction === 1) {
                            type = "monthOut";
                        } else if (carType === 0 && direction === 0) {
                            type = "tempIn";
                        } else if (carType === 0 && direction === 1) {
                            type = "tempOut";
                        }

                        // Find if there is already data for the day, if not, create a new object
                        const existingEntry = acc.find((item) => item.date === TRANSDATE);
                        if (existingEntry) {
                            existingEntry[type] = countPlate;
                        } else {
                            const newEntry = {
                                date: TRANSDATE,
                                [type]: countPlate,
                            };
                            acc.push(newEntry);
                        }
                        return acc;
                    }, []);
                    this.organizedMonthFlowData.length > 0
                        ? cantFindArea.classList.remove('block')
                        : cantFindArea.classList.add('block');
                })
        },
        // Period traffic flow - Default today
        thisDateFlow() {
            this.searchFlowDateData.Time = YYYY + '-' + MM + '-' + dd;
        },
        // Period traffic flow - Search by date
        searchFlowDate() {
            const searchFlowDateApi = `/api/flowhour`;
            const cantFindArea = document.querySelector('.cantFind-Area-flow');
            this.isLoading = true;
            this.searchFlowDateData.stationId = this.stationId;
            axios
                .post(searchFlowDateApi, { target: this.searchFlowDateData })
                .then((response) => {
                    this.isLoading = false;
                    this.flowDateData = response.data;
                    const flowMonthTable = document.querySelector('.flowMonthTable');
                    const flowDateTable = document.querySelector('.flowDateTable');
                    flowDateTable.classList.remove('d-none');
                    flowDateTable.classList.add('block');
                    flowMonthTable.classList.remove('block');
                    flowMonthTable.classList.add('d-none');
                    // Organize data by hour (reduce)
                    this.organizedDateFlowData = this.flowDateData.reduce((acc, entry) => {
                        const { TRANSHOUR, carType, direction, countPlate } = entry;
                        // Set identity and entry/exit type
                        let type;
                        if (carType === 1 && direction === 0) {
                            type = "monthIn";
                        } else if (carType === 1 && direction === 1) {
                            type = "monthOut";
                        } else if (carType === 0 && direction === 0) {
                            type = "tempIn";
                        } else if (carType === 0 && direction === 1) {
                            type = "tempOut";
                        }

                        // Find if there is already data for the hour, if not, create a new object
                        const existingHourEntry = acc.find((item) => item.hour === TRANSHOUR);
                        if (existingHourEntry) {
                            existingHourEntry[type] = countPlate;
                        } else {
                            const newHourEntry = {
                                hour: TRANSHOUR,
                                [type]: countPlate,
                            };
                            acc.push(newHourEntry);
                        }

                        return acc;
                    }, []);
                    this.organizedDateFlowData.length > 0
                        ? cantFindArea.classList.remove('block')
                        : cantFindArea.classList.add('block');
                })
        },
        // Period traffic flow - Export the report
        flowToExcel() {
            // Export the report of monthly traffic flow
            if (flowMonthTable.classList[2] == 'block') {
                let xlsxParam = { raw: true };
                let wb = XLSX.utils.table_to_book(document.querySelector('#flowMonthTable'), xlsxParam);
                const wbout = XLSX.write(wb, { booklype: 'xlsx', bookSST: true, type: 'array' });
                try {
                    FileSaver.saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${this.searchFlowMonthData.Time} 時段流量報表.xlsx`);
                } catch (e) {
                    if (typeof console !== undefined) {
                        console.log(e, wbout);
                    }
                }
                return wbout
                // Export the report of hourly traffic flow
            } else if (flowDateTable.classList[2] == 'block') {
                let xlsxParam = { raw: true };
                let wb = XLSX.utils.table_to_book(document.querySelector('#flowDateTable'), xlsxParam);
                const wbout = XLSX.write(wb, { booklype: 'xlsx', bookSST: true, type: 'array' });
                try {
                    FileSaver.saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${this.searchFlowDateData.Time} 時段流量報表.xlsx`);
                } catch (e) {
                    if (typeof console !== undefined) {
                        console.log(e, wbout);
                    }
                }
                return wbout
            };
        },
        // TransactionDetails
        // TransactionDetails - Default today's EV
        thisDateTransactionDetails(searchTransactionDetailsData) {
            this.searchTransactionDetailsData.stationId = this.stationId;
            this.searchTransactionDetailsData.startTime = YYYY + '-' + MM + '-' + dd;
            this.searchTransactionDetailsData.endTime = YYYY + '-' + MM + '-' + dd;
            this.searchTransactionDetailsData.isElectric = true;
            this.searchTransactionDetails();
        },
        // TransactionDetails - search
        searchTransactionDetails(searchTransactionDetailsData) {
            const getTransactionApi = `/api/transaction`;
            const cantFindArea = document.querySelector('.cantFind-Area');
            this.isLoading = true;
            this.searchTransactionDetailsData.stationId = this.stationId;
            if (this.searchTransactionDetailsData.startTime > this.searchTransactionDetailsData.endTime) {
                this.isLoading = false;
                alert("請確認選擇區間")
            } else {
                if (this.searchTransactionDetailsData.startTime != '' && this.searchTransactionDetailsData.endTime != '') {
                    axios
                        .post(getTransactionApi, { target: this.searchTransactionDetailsData })
                        .then((response) => {
                            this.transactionDetails = response.data;
                            this.isLoading = false;
                            this.transactionDetails.length > 0
                                ? cantFindArea.classList.remove('block')
                                : cantFindArea.classList.add('block');
                        })
                } else {
                    this.isLoading = false;
                    alert("請選擇日期")
                }
            }
        },
        // TransactionDetails - Export the report
        transactionDetailstoExcel() {
            let xlsxParam = { raw: true };
            let wb = XLSX.utils.table_to_book(document.querySelector('#transactionDetailsTable'), xlsxParam);
            const wbout = XLSX.write(wb, { booklype: 'xlsx', bookSST: true, type: 'array' });
            try {
                FileSaver.saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${this.searchTransactionDetailsData.startTime} ~ ${this.searchTransactionDetailsData.endTime} 交易明細報表.xlsx`);
            } catch (e) {
                if (typeof console !== undefined) {
                    console.log(e, wbout);
                }
            }
            return wbout
        },
        checkIsElectric() {
            const checked = document.getElementById('isElectric');
            this.isElectric = checked.checked;
            checked.addEventListener('change', handleChange);
            function handleChange() {
                this.isElectric = checked.checked;
            }
        },
        // TransactionStatistic - Default today
        istodayTransactionStatistic() {
            this.searchTransactionStatisticsData.startTime = YYYY + '-' + MM + '-' + dd;
            this.searchTransactionStatisticsData.endTime = YYYY + '-' + MM + '-' + dd;
            this.searchTransactionStatisticsData.stationId = this.stationId;
        },
        // TransactionStatistic - search
        searchTransactionStatistic(searchTransactionStatisticsData) {
            const searchTransactionStatisticApi = `/api/statistic`;
            const cantFindArea1 = document.querySelector('.cantFind-Area-transactionStatisticsAll');
            this.searchTransactionStatisticsData.stationId = this.stationId;
            if (this.searchTransactionStatisticsData.startTime > this.searchTransactionStatisticsData.endTime) {
                alert("請確認選擇區間")
            } else {
                if (this.searchTransactionStatisticsData.startTime != '' && this.searchTransactionStatisticsData.endTime != '') {
                    this.isLoading = true;
                    axios
                        .post(searchTransactionStatisticApi, { target: this.searchTransactionStatisticsData })
                        .then((response) => {
                            this.transactionStatisticsAll = response.data;
                            this.isLoading = false;
                            this.transactionStatisticsAll.length > 0
                                ? cantFindArea1.classList.remove('block')
                                : cantFindArea1.classList.add('block');
                        })
                } else {
                    alert("請選擇日期")
                }
            }
        },
        // TransactionStatistic - Export the report
        transactionStatisticTabletoExcel(type, fn, dl) {
            let xlsxParam = { raw: true };
            let wb = XLSX.utils.table_to_book(document.querySelector('#transactionStatisticTable'), xlsxParam);
            const wbout = XLSX.write(wb, { booklype: 'xlsx', bookSST: true, type: 'array' });
            try {
                FileSaver.saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${this.searchTransactionStatisticsData.startTime} ~ ${this.searchTransactionStatisticsData.endTime} 交易統計報表.xlsx`);
            } catch (e) {
                if (typeof console !== undefined) {
                    console.log(e, wbout);
                }
            }
            return wbout
        },
    },
    mounted() {
        this.getStations();
        this.thisMonthFlow();
        this.thisDateFlow(); 
        this.thisDateTransactionDetails();
        this.checkIsElectric();
        this.istodayTransactionStatistic();
    },
})

app.mount('#app');