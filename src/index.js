const {httpGetJSON, httpGetHTML} = require('./http');
const HTMLParser = require('node-html-parser');
const cliProgress = require('cli-progress');
const fs = require('fs');

async function init(firstPage, lastPage) {
    let bar;

    let totalPages = 10000000;
    for (let i = firstPage; i <= lastPage && i <= totalPages; i++) {
        bar = new cliProgress.SingleBar({
            format: `Парсинг стр. ${i} из ${Math.min(lastPage, totalPages)} | {bar} | {percentage}% || {value}/{total} курсов`,
        }, cliProgress.Presets.shades_classic);

        const coursesUrl = `https://www.udemy.com/api-2.0/discovery-units/all_courses/?p=${i}&page_size=16&subcategory=&instructional_level=&lang=ru&price=&duration=&closed_captions=&subs_filter_type=&category_id=288&source_page=category_page&locale=ru_RU&currency=rub&navigation_locale=en_US&skip_price=true&sos=pc&fl=cat`;
        const json = await httpGetJSON(coursesUrl)
        const unit = json.unit;
        totalPages = unit.pagination.total_page;

        const courses = unit.items;
        let coursesToDB = [];
        const coursesIds = courses.map(c => c.id);

        const coursesPrices = await getPrices(coursesIds);

        bar.start(courses.length, 0);
        for (let [i, course] of courses.entries()) {
            bar.update(i + 1);
            let courseToDB = {};
            const courseFullUrl = `https://www.udemy.com${course.url}`;

            courseToDB.id = course.id;
            courseToDB.title = course.title;
            courseToDB.rating = course.avg_rating;
            courseToDB.length = course.content_info_short;
            courseToDB.url = courseFullUrl;
            courseToDB.price = coursesPrices.courses[course.id].price.amount
            coursesToDB.description = course.headline;
            try {
                console.log(`\n${courseToDB.url} ${courseToDB.id}`);
                courseToDB = await fillFullDescription(courseToDB);
            } catch (err) {
                if (err === 'redirected') {
                    console.log(`\nКурс ${course.id} не найден. Пропуск...`);
                    continue;
                }else {
                    throw err;
                }
            }
            coursesToDB.push(courseToDB);
        }
        bar.stop();
        fs.writeFileSync(`pages/${i}.json`, JSON.stringify(coursesToDB));
    }


}

async function fillFullDescription(course) {
    const htmlText = await httpGetHTML(course.url);
    const htmlEl = HTMLParser.parse(htmlText);
    const requirements = htmlEl.querySelector('.ud-component--course-landing-page-udlite--requirements ul');

    course.requirements = requirements.childNodes.map(e => e.text).join('; ');

    const description = htmlEl.querySelector('.ud-component--course-landing-page-udlite--description div[data-purpose="safely-set-inner-html:description:description"]');
    if (description) {
        course.description = removeEnglishDescription(description.text);
    } else {
        console.log(`\nКурс ${course.id} без описания!`)
    }

    const authors = htmlEl.querySelector('.udlite-instructor-links');
    course.authors = authors.childNodes.map(e => e.text).join(', ');

    const learn = htmlEl.querySelector('.ud-component--course-landing-page-udlite--whatwillyoulearn ul');
    course.learn = learn.childNodes.map(e => e.text).join('; ');
    return course;
}

function removeEnglishDescription(description) {
    if (description.includes('-----')) {
        return description.split('-----')[0];
    } else {
        return description;
    }
}


async function getPrices(ids) {
    const pricesUrl = `https://www.udemy.com/api-2.0/pricing/?course_ids=${ids.join(',')}&fields[pricing_result]=price`;
    return await httpGetJSON(pricesUrl);
}


// с 1 по 5 страницу парсим
init(21, 25);
