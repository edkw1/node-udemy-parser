const {httpGetJSON, httpGetHTML} = require('./http');
const HTMLParser = require('node-html-parser');
const cliProgress = require('cli-progress');
const fs = require('fs');


let TOTAL_PAGES = 1000000;
let BAR;

async function init(firstPage, lastPage) {

    for (let i = firstPage; i <= lastPage && i <= TOTAL_PAGES; i++) {
        BAR = new cliProgress.SingleBar({
            format: `Парсинг стр. ${i} из ${Math.min(lastPage, TOTAL_PAGES)} | {bar} | {percentage}% || {value}/{total} курсов`,
        }, cliProgress.Presets.shades_classic);

        const coursesToDB = await parsePage(i);

        fs.writeFileSync(`pages/${i}.json`, JSON.stringify(coursesToDB));
    }
}

async function parsePage(i) {
    const coursesUrl = `https://www.udemy.com/api-2.0/discovery-units/all_courses/?p=${i}&page_size=16&subcategory=&instructional_level=&lang=ru&price=&duration=&closed_captions=&subs_filter_type=&category_id=288&source_page=category_page&locale=ru_RU&currency=rub&navigation_locale=en_US&skip_price=true&sos=pc&fl=cat`;
    const json = await httpGetJSON(coursesUrl)
    const unit = json.unit;

    TOTAL_PAGES = unit.pagination.total_page;
    const courses = unit.items;
    const coursesToDB = [];

    BAR.start(courses.length, 0);
    for (let [i, course] of courses.entries()) {
        BAR.update(i + 1);
        console.log('\n'+course.id);
        const courseToDB = await parseCourse(course.id);
        coursesToDB.push(courseToDB);
    }
    BAR.stop();

    return coursesToDB;
}

async function parseCourse(courseId) {
    const courseToDB = {};
    const courseInfo = await httpGetJSON(`https://www.udemy.com/api-2.0/courses/${courseId}?fields[course]=@all`);
    courseToDB.id = courseId;
    courseToDB.price = courseInfo.price_detail ? courseInfo.price_detail.amount : 0;
    courseToDB.title = courseInfo.title;
    courseToDB.url = `https://www.udemy.com${courseInfo.url}`;
    courseToDB.rating = courseInfo.avg_rating;
    courseToDB.lengthInMinutes = courseInfo.estimated_content_length;
    courseToDB.description = HTMLParser.parse(courseInfo.description).text;
    courseToDB.requirements = courseInfo.requirements_data.items.join('; ');
    courseToDB.authors = courseInfo.visible_instructors.map(item => item.display_name).join(', ');
    courseToDB.learn = courseInfo.what_you_will_learn_data.items.join('; ');
    return courseToDB;
}

// с 1 по 5 страницу парсим
init(21, 23);
