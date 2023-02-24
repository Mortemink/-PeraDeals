const StatesObject = {
    services: {
        selector: document.getElementById('btn-services'),
        action: {
            div: document.querySelector(".create-service"),
            name: document.getElementById("serviceName"),
            description: document.getElementById("serviceDescription"),
            price: document.getElementById("servicePrice"),
        },
    },
    users: {
        selector: document.getElementById('btn-users'),
        action: {
            div: document.querySelector(".find-users"),
            searchField:  document.getElementById("searchField")
        },
    },
    contentDiv: document.getElementById("adminContent")
}

// SERVICE
RenderContent('service', null);
StatesObject.services.selector.addEventListener('click', async () => {
    if (StatesObject.services.selector.classList.contains('activated-button'))
        return;

    StatesObject.services.selector.classList.add('activated-button');
    StatesObject.users.selector.classList.remove('activated-button');

    StatesObject.services.action.div.classList.remove('disabled');
    StatesObject.users.action.div.classList.add('disabled');

    await RenderContent('service', null);
});
//

// USER
StatesObject.users.selector.addEventListener('click', () => {
    if (StatesObject.users.selector.classList.contains('activated-button'))
        return;

    StatesObject.users.selector.classList.add('activated-button');
    StatesObject.services.selector.classList.remove('activated-button');

    StatesObject.users.action.div.classList.remove('disabled');
    StatesObject.services.action.div.classList.add('disabled');

    StatesObject.contentDiv.innerHTML = '';
});
StatesObject.users.action.searchField.addEventListener('input', async (event) => {
    const SearchField = StatesObject.users.action.searchField;

    if (SearchField.value.replaceAll(' ', '').length >= 2)
        await RenderContent('user', SearchField.value.replaceAll(' ', '_'))
})
//

async function RenderContent(type, value) {
    const URL = `/get_info?type=${type}${value !== null ? '&value=' + value : ''}`;
    fetch(URL)
        .then(async data => {
            StatesObject.contentDiv.innerHTML = "";

            data = await data.json();

            if (data.length === 0) {
                StatesObject.contentDiv.innerHTML = "Ничего не найдено."
            } else {
                data.forEach(item => {
                    switch (type) {
                        case 'service': {
                            StatesObject.contentDiv.innerHTML +=
                                `
                                <div class="historyItem">
                                    <div class="uslugaName">
                                        <p>Название: ${ item.name }</p>
                                    </div>
                                    <div class="uslugaPrice">
                                        <p>Цена: ${ item.cost }<span> ₽</span></p>
                                    </div>
                                    <div style="width: 100%; margin-top: 2px; margin-bottom: 2px;"></div> <!-- wrapper -->
                                    <div class="uslugaDescription">Описание: ${item.description}</div>
                                    <button class="uslugaDelete" onclick="DeleteService('${item._id}');">Удалить услугу</button>
                                </div>
                                `;
                            break;
                        }
                        case 'user': {
                            const user =
                                `<div class="userItem" id="${item._id}"> 
                                    <p class="userName">${item.firstname} ${item.lastname}</p>
                                    <p class="userMail">${item.email}</p>
                                    <img src="/img/linkImg.png">
                                </div>`;
                            StatesObject.contentDiv.innerHTML += user;

                            const script = document.createElement('script');
                            script.innerHTML =
                                `
                                     document.getElementById("${item._id}").addEventListener('click', () => { console.log('${item._id}'); });
                                `;
                            document.body.append(script);
                            break;
                        }
                    }
                });
            }
        })
        .catch((err) => {
            if (err)
                console.error(err);

            StatesObject.contentDiv.innerHTML = "Произошла какаято ашипка!";
        });
}

async function ShowUser(_id) {
    const URL = `/get_info?type=user&value=${_id}`;
    fetch(URL)
        .then(async data => {
            data = await data.json();
            if (data[0]?._id !== undefined) {
                const user = data[0];
                const popup = document.querySelector('.profileBlockPopUp');
                popup.innerHTML = `<div class="userInfo">
                                        <p>${ user.firstname }</p>
                                        <p>${ user.lastname }</p>
                                    </div>
                                    <div class="userStatsAdmin">
                                        <div class="statsNaming">
                                            <p>Дата регистрации</p>
                                            <p>Почта</p>
                                        </div>
                                        <div class="stats">
                                            <p>${ user.created.toLocaleDateString('ru-RU') }</p>
                                            <p>${ user.email }</p>
                                        </div>
                                    </div>
                                    <div class="addRemoveService">
                                        <form>
                                            <button><img src="/img/addService.png"></button>
                                        </form>
                                        <form>
                                            <button><img src="/img/removeService.png"></button>
                                        </form>
                                    </div>
                                    <div class="visitHistory">
                                        <p style="font-size: 22px; margin-bottom: 10px;">
                                            История посещений
                                        </p>
                                    <!--</div>-->`;

                user.history.forEach(item => {
                    popup.innerHTML += `<div class="historyItem">
                                            <div class="date">
                                                <p>${ item.serviceUseDate.toLocaleDateString('ru-RU') }</p>
                                            </div>
                                            <div class="uslugaName">
                                                <p>${ item.serviceName }</p>
                                            </div>
                                            <div class="uslugaPrice">
                                                <p>${ item.servicePrice }<span> ₽</span></p>
                                            </div>
                                        </div>`;
                    popup.innerHTML += `</div>`;
                })
            }
        })
        .catch(e => {
            console.error(e);
        });
}

async function DeleteService(_id) {
    const URL = `/admin_panel/${ _id }?type=service&_method=DELETE`;
    fetch(URL, { method: "POST" })
        .then(data => {
            data.json().then((_data) => console.log(_data) );
            RenderContent('service', null);
        })
        .catch(e => console.error(e) );
}