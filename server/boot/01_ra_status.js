'use strict';

var moment = require('moment'),
    _ = require('lodash');

module.exports = function(app) {
  /*
   * The `app` object provides access to a variety of LoopBack resources such as
   * models (e.g. `app.models.YourModelName`) or data sources (e.g.
   * `app.datasources.YourDataSource`). See
   * http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects
   * for more info.
   */

  var moStatus = app.models.MoStatus,
      qtlyStatus = app.models.QtlyStatus,
      emp = app.models.Employee,
      inj = app.models.Injury,
      veh = app.models.VehAccident,
      d = moment(),
      PAST90DAYS = moment().subtract(90,'days');

    Promise.all([
        emp.find(),
        inj.find({"where":{"date":{"gte": PAST90DAYS}}}),
        veh.find({"where":{"date":{"gte": PAST90DAYS}}})
    ]).then(function(values){
        var e = values[0],
            i = values[1],
            v = values[2],
            quarterlyEmployees,
            monthlyEmployees = [],
            listOfEmployees = [];


        v.forEach(function(v){
        e.forEach(function(e){
            if (v.employee_id === e.id){
                monthlyEmployees.push(e);
            }
        });
    });
        i.forEach(function(i){
            e.forEach(function(e){
                if (i.employee_id === e.id){
                    monthlyEmployees.push(e);
                }
            });
        });
        e.forEach(function(e){
            if(e.hire_date > PAST90DAYS){
                monthlyEmployees.push(e);
            }
        });
        quarterlyEmployees = _.differenceBy(e,monthlyEmployees,'id').sort(ByLastname);
        monthlyEmployees = _.uniqBy(monthlyEmployees,'id').sort(ByLastname);
        listOfEmployees.push(monthlyEmployees,quarterlyEmployees);

        function ByLastname(a,b){
            if (a.lname < b.lname) return -1;
            if (a.lname > b.lname) return 1;
            return 0;} //sort by

        return listOfEmployees;
    }).catch(function(err){
        console.log(err);
    }).then(function (e) {
      var monthlyEmployees = e[0],
        quarterlyEmployees = e[1],
        d = moment(),
        qtr = moment().quarter(),
        yr = moment().year(),
        mo = moment().month(),
        status;

      quarterlyEmployees.forEach(function (e) {
        qtlyStatus.create({
          "created_on": d,
          "qtr": qtr,
          "yr": yr,
          "ra_required": 1,
          "ra_completed": 0,
          "requirement_met": 0,
          "met_requirement": null,
          "employee_id": e.id
        }).then(function () {
          console.info("Qtly record created");
          qtlyStatus.findOne({"where": {"yr": yr, "qtr": qtr, "employee_id": e.id}})
            .then(function (qs) {
              var d = moment(),
                qtr = moment().quarter(),
                yr = moment().year(),
                mo = moment().month(),
                status = (mo == 2 || mo == 5 || mo == 8 || mo == 11)? "required":"optional";

              moStatus.create({
                "created_on": d,
                "qtr": qtr,
                "mo": mo,
                "yr": yr,
                "status": status,
                "requirement_met": 0,
                "met_requirement": null,
                "ra_id": null,
                "employee_id": e.id,
                "qs_id": qs.id
              }).then(function(){console.log("Monthly status created for qtly.")}).catch(function(err){console.error("Error in creating monthly status", err);})
              console.log( "query successful");

            }).catch(function (err) {
            console.error(err)
          })
        })
      });
      return monthlyEmployees;
    }).then(function (MoEmp) {

           var d = moment(),
               qtr = moment().quarter(),
                yr = moment().year(),
                mo = moment().month();

        MoEmp.forEach(function(e){
           qtlyStatus.create({
                "created_on": d,
                "qtr": qtr,
                "yr": yr,
                "ra_required": 3,
                "ra_completed": 0,
                "requirement_met": 0,
                "met_requirement": null,
                "employee_id": e.id
            })
             .then(function (){
                console.info("qs record created");
                qtlyStatus.findOne({"where":{"yr": yr,"qtr": qtr,"employee_id": e.id}})
               .then(function(qs){
                 console.log("Found record: " + qs);
                 moStatus.create({
                   "created_on":d,
                   "qtr": qtr,
                   "mo": mo,
                   "yr": yr,
                   "status": "required",
                   "requirement_met": 0,
                   "met_requirement": null,
                   "ra_id": null,
                   "employee_id": e.id,
                   "qs_id": qs.id
                 })}).catch(function(err){console.error("Error with creating monthly status: ", err)})
            }).catch(function(err){console.error("Error with creating qtly status: ", err)})
        })
    })
};
