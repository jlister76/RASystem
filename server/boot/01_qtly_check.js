'use strict';

var moment = require('moment'),
  _ = require('lodash');

module.exports = function(app){
  /*
   * The `app` object provides access to a variety of LoopBack resources such as
   * models (e.g. `app.models.YourModelName`) or data sources (e.g.
   * `app.datasources.YourDataSource`). See
   * http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects
   * for more info.
   */
  var empl = app.models.employee,
    i = app.models.injury,
    v = app.models.VehAccident,
    mo = 8,
    ninetyDays = moment().subtract(90, 'days'),
    mthly = [];


  if (mo === 0 || mo === 3 || mo === 6 || mo === 9){
        Promise.all([
          empl.find(), //return all employees
          i.find({"where":{"date":{"gte": ninetyDays}}}), //return all injuries within 90 days
          v.find({"where":{"date":{"gte": ninetyDays}}}) //return all vehicle accidents within 90 days
        ])
          .then(function(data) {
              empl = data[0];
                i = data[1];
                v = data[2];

            getNewHires(empl);
            getInjuriesAndAccidents(i,v);
            setRequirement(empl,mthly);


              function getNewHires (empl){
                empl.forEach(function(e){
                  if (e.hire_date <= ninetyDays){
                    mthly.push(e.id);
                  }
                })
              }
              function getInjuriesAndAccidents (inj,acc){
                inj.forEach(function(i){
                  mthly.push(i.employee_id)
                });
                acc.forEach(function(a){
                  mthly.push(a.employee_id)
                })
              }
              function createQtlyInstances (r,id){

                   app.models.QtlyStatus.create({
                     "created_on": moment(),
                     "qtr": moment().quarter(),
                     "yr": moment().year(),
                     "required_count": r,
                     "completed_count": 0,
                     "requirement_met": 0,
                     "met_requirement": null,
                     "employee_id": id
                   })
                     .then(function(o){
                       console.log(o);
                     })
                     .catch(function(err){
                       console.log(err);
                     })

              }
              function setRequirement(empl,mthly){
                empl.forEach(function(e){
                  var id = e.id,
                    r = (isInAry(id,mthly))?3:1;

                  createQtlyInstances(r,id);

                  function isInAry (v,ary){
                    return ary.indexOf(v) > -1;
                  }

                });
              }


          })
          .catch(function(err){ console.log("Error.", err)})


  }else{
    console.log("Quarterly requirement is only set in the first month of the quarter. This is the "+ mo + " month of the " + moment().quarter() + " quarter of " + moment().year() +".")
  }


};


