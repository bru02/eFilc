class DatePicker {
    constructor() {
        this.date = new Date();
        this.currentYear = this.date.getFullYear();
        this.currentMonth = this.date.getMonth();
        this.currentDay = this.date.getDate();
        this.month = this.currentMonth + 0;
        this.year = this.currentYear + 0;
        this.day = this.currentDay + 0;
        this.selectedYear = null;
        this.selectedDay = null;
        this.selectedMonth = null;
        this.daysShort = ["V", "H", "K", "S", "C", "P", "S"];
        let self = this;
        $('#date').on('focus', function () {
            $("#dp").show();
        });
        $(document).on('click', function (e) {
            let t = $(e.target);
            if (!(t.is('#date') || t.closest('.calendar-wrap').is()))
                $("#dp").hide();
        });
        $('#date').on('blur', function () {
            let t = $(this);
            if (t.is('.valid')) {
                let d = t.val().split('-');
                if (d.length == 3) {
                    self.selectedDay = d[2];
                    self.selectedMonth = d[1] - 1;
                    self.selectedYear = d[0];
                    self.renderCalendar();
                }
            }
        });
        this.renderCalendar()
    }
    /**
    *	Store and parse month data
    * @param month, year
    *	@return monthData object
    */
    monthData(month, year) {
        var monthData = {
            year: year,
            month: month,
            // Number of days in current month
            monthDaysCount: function () {
                var daysCount = new Date(year, month + 1, 0).getDate();
                return daysCount;
            },
            // Get week day for every day in the month 0 to 6.
            weekDay: function (d) {
                var dayNum = new Date(year, month, d);
                return dayNum.getDay();
            }
        };
        return monthData;
    }
    /**
    *	Distribute month days to the according table cells
    * @param monthData object
    *	@return HTML
    */
    distributeDays(monthData) {
        var day = 1;
        var dayCount = monthData.monthDaysCount();
        var out = "";
        while (day <= dayCount) {
            out += "<tr>";
            for (var i = 0; i < 7; i++) {
                if (monthData.weekDay(day) == i) {
                    let cls = (this.selectedDay == day && this.selectedMonth == monthData.month && this.selectedYear == monthData.year) ? 'active day' : (this.currentDay == day && this.currentMonth == monthData.month && this.currentYear == monthData.year) ? 'today day' : ((this.currentDay > day && this.currentMonth == monthData.month) ? 'dsb' : 'day');
                    out += `<td class="${cls}">${day++}</td>`;
                }
                else {
                    out += "<td></td>";
                }
                if (day > dayCount) {
                    break;
                }
            }
            out += "</tr>";
        }
        return out;
    }
    /**
    *	Render calendar HTML to page
    */
    renderCalendar() {
        var monthData = this.monthData(this.month, this.year);
        var calendarContainer = $("#dp");
        let out = "<div class=\"calendar-wrap\"><div class=\"calendar-month-name center\">";
        if (this.currentYear < this.year || this.currentMonth < this.month)
            out += `<a href=\"#\" id=\"pm\" class=\"left\">&#10094;</a>`;
        out += `<span class=\"month-name\"><b>${[
            "Január",
            "Február",
            "Március",
            "Április",
            "Május",
            "Június",
            "Július",
            "Augusztus",
            "Szeptember",
            "Október",
            "November",
            "December"
        ][monthData.month]}</b> ${monthData.year}</span><a href=\"#\" id=\"nm\" class=\"right\">&#10095;</a></div><div class=\"calendar-month\"><table class=\"calendar\"><thead class=\"calendar-header\"><tr class=\"calendar-row\"><td>${this.daysShort.join('</td><td>')}</td></tr></thead><tbody id=\"cb\" class=\"calendar-body\">${this.distributeDays(monthData)}</tbody></table></div></div>`;
        calendarContainer.html(out);
        let self = this;
        $('#nm').on('click', function () {
            self.month++;
            if (self.month > 11) {
                self.month = 0;
                self.year++;
            }
            self.renderCalendar();
        });
        $('#pm').on('click', function () {
            self.month--;
            if (self.month < 0) {
                self.month = 11;
                self.year--;
            }
            self.renderCalendar();
        });
        $('#cb').on('click', function (e) {
            $(this).find('.active').removeClass('active');
            let t = $(e.target);
            if (!t.is('.dsb')) {
                self.selectedDay = t.addClass('active').html();
                self.selectedMonth = self.month;
                self.selectedYear = self.year;
                $('#date').val(`${self.year}-${("0" + (self.month + 1)).slice(-2)}-${("0" + t.html()).slice(-2)}`);
                calendarContainer.hide();
            }
        });
    }
}