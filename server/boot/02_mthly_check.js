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
    mo = 10,
    ninetyDays = moment().subtract(90, 'days'),
    mthly = [],
    status;

  Promise.all([
    empl.find(), //return all employees
    i.find({"where":{"date":{"gte": ninetyDays}}}), //return all injuries within 90 days
    v.find({"where":{"date":{"gte": ninetyDays}}}) //return all vehicle accidents within 90 days
  ])
    .then(function(data){
      empl = data[0];
      i = data[1];
      v = data[2];

      getNewHires(empl);
      getInjuriesAndAccidents(i,v);
      setMthlyStatus(empl,mthly);

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
      function createMthlyInstance (s,id,qs){

        app.models.MoStatus.create({
          "created_on": moment(),
          "qtr": moment().quarter(),
          "yr": moment().year(),
          "mo": moment().month(),
          "status": s,
          "met_requirement": null,
          "employee_id": id,
          "ra_id": null,
          "qs_id": qs
        })
          .then(function(o){
            //console.log(o);
          })
          .catch(function(err){
            console.log(err);
          })

      }
      function setMthlyStatus(empl,mthly){

        empl.forEach(function(e){
          app.models.QtlyStatus.findOne({"where": {"employee_id": e.id,"yr":moment().year(),"qtr":moment().quarter()}})
            .then(function(qs){
              if(isInAry(e.id,mthly)){
                status = "required";
              }else if(mo === 0 || mo === 3 || mo === 6 || mo === 9 && !isInAry(e.id,mthly)){
                status = "optional";
              }else if(mo === 1 || mo === 4 || mo === 7 || mo === 10 && !isInAry(e.id,mthly) && !qs.requirement_met){
                status = "optional";
              }else if(mo === 1 || mo === 4 || mo === 7 || mo === 10 && !isInAry(e.id,mthly) && qs.requirement_met){
                status = "complete";
              }else if(mo === 2 || mo === 5 || mo === 8 || mo === 11 && !isInAry(e.id,mthly) && !qs.requirement_met){
                status = "required";
              }else if(mo === 2 || mo === 5 || mo === 8 || mo === 11 && !isInAry(e.id,mthly) && qs.requirement_met){
                status = "complete";
              }
              createMthlyInstance(status,e.id,qs.id);

            })
            .catch(function(err){console.error(err)});
        });


        function isInAry(v,ary){
          return ary.indexOf(v) > -1;
        }
      }
    })
    .catch(function(err){
      console.error(err);
    })



};
